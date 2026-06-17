"""
src/ocr_service.py — OCR-powered invoice/receipt parser for LedgerWatch AI
Uses EasyOCR (deep learning) instead of Tesseract. Render-compatible.
"""

import io
import json
import logging
import os
import random
import re
import tempfile
from contextlib import contextmanager
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
from PIL import Image, ImageDraw, ImageFont

# ✅ EasyOCR — pure Python, no system binaries needed
try:
    import easyocr

    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    easyocr = None
    logging.warning("easyocr not installed — OCR will use mock mode")

# PDF support
try:
    from pdf2image import convert_from_path

    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False
    convert_from_path = None

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger(__name__)


# ─── Data Models ─────────────────────────────────────────────────────────────


@dataclass
class OCRLine:
    """Single line of OCR output with bounding box and confidence."""

    text: str
    confidence: float
    bbox: List[List[float]] = field(
        default_factory=list
    )  # [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]


@dataclass
class OCRExtraction:
    """Structured output from invoice/receipt OCR."""

    amount: Optional[float] = None
    date: Optional[str] = None  # ISO format YYYY-MM-DD
    vendor: Optional[str] = None
    transaction_type: Optional[str] = "PAYMENT"
    confidence: float = 0.0
    raw_text: str = ""
    lines: List[OCRLine] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_transaction_dict(self) -> Dict[str, Any]:
        """Convert to dict matching TransactionCreate schema."""
        return {
            "amount": self.amount,
            "date": self.date,
            "vendor": self.vendor,
            "type": self.transaction_type or "PAYMENT",
            "confidence": self.confidence,
            "source": "ocr_invoice",
        }

    def to_dict(self) -> Dict[str, Any]:
        """Full dict export."""
        return {
            "amount": self.amount,
            "date": self.date,
            "vendor": self.vendor,
            "transaction_type": self.transaction_type,
            "confidence": self.confidence,
            "raw_text": (
                self.raw_text[:1000] + "..."
                if len(self.raw_text) > 1000
                else self.raw_text
            ),
            "lines_count": len(self.lines),
            "metadata": self.metadata,
        }


# ─── EasyOCR Engine ──────────────────────────────────────────────────────────


class EasyOCREngine:
    """Wrapper around EasyOCR with lazy loading and caching."""

    _instance = None
    _reader = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, languages: List[str] = None, gpu: bool = False):
        if self._reader is not None:
            return

        if not EASYOCR_AVAILABLE:
            raise RuntimeError("EasyOCR not installed. Run: pip install easyocr")

        languages = languages or ["en"]
        logger.info(f"Initializing EasyOCR (langs={languages}, gpu={gpu})...")
        start = datetime.now()

        try:
            self._reader = easyocr.Reader(languages, gpu=gpu)
            elapsed = (datetime.now() - start).total_seconds()
            logger.info(f"EasyOCR ready in {elapsed:.1f}s")
        except Exception as e:
            logger.error(f"EasyOCR init failed: {e}")
            raise

    @property
    def reader(self):
        if self._reader is None:
            raise RuntimeError("EasyOCR not initialized")
        return self._reader

    def readtext(self, image_np: np.ndarray) -> List[Tuple]:
        """Run OCR on numpy image array."""
        try:
            # EasyOCR returns: [(bbox, text, confidence), ...]
            results = self.reader.readtext(image_np)
            return results
        except Exception as e:
            logger.error(f"OCR readtext failed: {e}")
            raise


# ─── Invoice OCR Service ────────────────────────────────────────────────────


class InvoiceOCR:
    """
    Production-grade OCR service for parsing invoices/receipts into structured data.
    Uses EasyOCR for text extraction + advanced regex + heuristics for field parsing.
    """

    # Transaction type keywords mapped to standard types
    TYPE_KEYWORDS = {
        "PAYMENT": [
            "payment",
            "paid",
            "pay",
            "credit card",
            "debit card",
            "card",
            "checkout",
            "purchase",
        ],
        "TRANSFER": [
            "transfer",
            "wire",
            "ach",
            "bank transfer",
            "sent",
            "received",
            "deposit",
        ],
        "CASH_OUT": ["cash out", "withdrawal", "atm", "cash", "withdraw", "debit"],
        "CASH_IN": ["cash in", "deposit", "credit", "top up", "load", "add money"],
        "DEBIT": ["debit", "deduction", "charge", "fee", "subscription"],
    }

    # Vendor detection: common words that are NOT vendor names
    VENDOR_STOPWORDS = {
        "invoice",
        "receipt",
        "bill",
        "statement",
        "total",
        "amount",
        "date",
        "from",
        "to",
        "payment",
        "tax",
        "subtotal",
        "discount",
        "due",
        "balance",
        "account",
        "order",
        "customer",
        "merchant",
        "seller",
        "buyer",
        "item",
        "qty",
        "price",
        "description",
        "thank",
        "please",
        "contact",
        "phone",
        "email",
        "website",
        "www",
        "http",
    }

    def __init__(
        self,
        languages: List[str] = None,
        gpu: bool = False,
        mock_mode: bool = False,
        dpi: int = 300,
    ):
        """
        Initialize OCR service.

        Args:
            languages: OCR languages (default: ['en'])
            gpu: Use GPU if available (Render = False)
            mock_mode: Synthetic data mode for testing
            dpi: PDF-to-image conversion resolution
        """
        self.languages = languages or ["en"]
        self.gpu = gpu
        self.mock_mode = mock_mode
        self.dpi = dpi
        self._engine = None

        if not mock_mode and EASYOCR_AVAILABLE:
            try:
                self._engine = EasyOCREngine(self.languages, gpu=gpu)
                self.easyocr_available = True
            except Exception as e:
                logger.warning(f"EasyOCR init failed: {e}")
                self.easyocr_available = False
        else:
            self.easyocr_available = False

        if mock_mode:
            logger.info("MOCK MODE: Using synthetic invoice generation")
        elif not self.easyocr_available:
            logger.warning("EasyOCR unavailable — falling back to mock mode")

    # ─── Image Processing ───────────────────────────────────────────────────

    def _preprocess_image(self, image: Image.Image) -> np.ndarray:
        """
        Preprocess image for better OCR accuracy.
        - Convert to RGB
        - Resize if too small (min 800px width)
        - Normalize contrast
        """
        # Convert to RGB if needed
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Resize small images (EasyOCR works better at higher res)
        w, h = image.size
        min_width = 800
        if w < min_width:
            ratio = min_width / w
            new_size = (min_width, int(h * ratio))
            image = image.resize(new_size, Image.LANCZOS)
            logger.debug(f"Resized image: {w}x{h} → {new_size[0]}x{new_size[1]}")

        # Convert to numpy array
        img_array = np.array(image)

        # Simple contrast normalization
        img_array = self._normalize_contrast(img_array)

        return img_array

    def _normalize_contrast(self, img: np.ndarray) -> np.ndarray:
        """Apply mild contrast enhancement."""
        # Convert to float for processing
        img_float = img.astype(np.float32)

        # Per-channel histogram stretch
        for i in range(3):
            channel = img_float[:, :, i]
            min_val = np.percentile(channel, 2)
            max_val = np.percentile(channel, 98)
            if max_val > min_val:
                channel = (channel - min_val) / (max_val - min_val) * 255
                img_float[:, :, i] = np.clip(channel, 0, 255)

        return img_float.astype(np.uint8)

    def _image_to_numpy(
        self, image_input: Union[str, Path, bytes, Image.Image]
    ) -> Tuple[np.ndarray, Image.Image]:
        """Convert various inputs to numpy array + PIL Image."""
        if isinstance(image_input, (str, Path)):
            image = Image.open(image_input)
        elif isinstance(image_input, bytes):
            image = Image.open(io.BytesIO(image_input))
        elif isinstance(image_input, Image.Image):
            image = image_input
        else:
            raise ValueError(f"Unsupported image input type: {type(image_input)}")

        img_array = self._preprocess_image(image)
        return img_array, image

    # ─── OCR Core ────────────────────────────────────────────────────────────

    def run_ocr(
        self, image_input: Union[str, Path, bytes, Image.Image]
    ) -> List[OCRLine]:
        """
        Run OCR on image and return structured lines.
        """
        if self.mock_mode or not self.easyocr_available:
            return self._generate_mock_lines()

        img_array, _ = self._image_to_numpy(image_input)

        try:
            results = self._engine.readtext(img_array)
            lines = []
            for bbox, text, conf in results:
                lines.append(
                    OCRLine(
                        text=text.strip(), confidence=round(float(conf), 3), bbox=bbox
                    )
                )
            logger.info(
                f"OCR extracted {len(lines)} lines, avg conf: {self._avg_confidence(lines):.3f}"
            )
            return lines
        except Exception as e:
            logger.error(f"OCR failed: {e}")
            raise

    def _avg_confidence(self, lines: List[OCRLine]) -> float:
        if not lines:
            return 0.0
        return sum(l.confidence for l in lines) / len(lines)

    # ─── PDF Support ────────────────────────────────────────────────────────

    def pdf_to_lines(self, pdf_path: Union[str, Path]) -> List[OCRLine]:
        """Convert PDF to images, then OCR each page."""
        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        if not PDF2IMAGE_AVAILABLE:
            raise RuntimeError("pdf2image not installed. Run: pip install pdf2image")

        if self.mock_mode:
            return self._generate_mock_lines()

        logger.info(f"Converting PDF: {pdf_path.name}")
        images = convert_from_path(str(pdf_path), dpi=self.dpi)

        all_lines = []
        for i, image in enumerate(images):
            logger.debug(f"OCR page {i+1}/{len(images)}")
            img_array = self._preprocess_image(image)
            results = self._engine.readtext(img_array)
            for bbox, text, conf in results:
                all_lines.append(
                    OCRLine(
                        text=text.strip(), confidence=round(float(conf), 3), bbox=bbox
                    )
                )

        logger.info(
            f"PDF OCR complete: {len(all_lines)} lines from {len(images)} pages"
        )
        return all_lines

    # ─── Field Extraction ───────────────────────────────────────────────────

    def extract_fields(self, lines: List[OCRLine]) -> OCRExtraction:
        """
        Parse structured fields from OCR lines using regex + heuristics.
        """
        # Build full text and preserve line order
        full_text = " ".join([l.text for l in lines])
        text_lower = full_text.lower()

        extraction = OCRExtraction(raw_text=full_text, lines=lines)

        # Extract fields with confidence scoring
        amount, amount_conf = self._extract_amount(lines)
        if amount is not None:
            extraction.amount = amount
            extraction.metadata["amount_confidence"] = amount_conf

        date_str, date_conf = self._extract_date(lines)
        if date_str:
            extraction.date = date_str
            extraction.metadata["date_confidence"] = date_conf

        vendor, vendor_conf = self._extract_vendor(lines)
        if vendor:
            extraction.vendor = vendor
            extraction.metadata["vendor_confidence"] = vendor_conf

        tx_type, tx_conf = self._extract_transaction_type(lines)
        if tx_type:
            extraction.transaction_type = tx_type
            extraction.metadata["type_confidence"] = tx_conf

        # Calculate aggregate confidence
        confs = [v for k, v in extraction.metadata.items() if k.endswith("_confidence")]
        if confs:
            extraction.confidence = round(sum(confs) / len(confs), 3)

        # Build metadata
        extraction.metadata.update(
            {
                "fields_found": [
                    k.replace("_confidence", "")
                    for k in extraction.metadata.keys()
                    if k.endswith("_confidence")
                ],
                "fields_missing": [
                    f
                    for f in ["amount", "date", "vendor", "transaction_type"]
                    if f not in extraction.metadata
                ],
                "text_length": len(full_text),
                "word_count": len(full_text.split()),
                "line_count": len(lines),
                "avg_line_confidence": self._avg_confidence(lines),
                "mock_mode": self.mock_mode or not self.easyocr_available,
            }
        )

        logger.info(
            f"Extracted {len(confs)}/4 fields, confidence: {extraction.confidence}"
        )
        return extraction

    def _extract_amount(self, lines: List[OCRLine]) -> Tuple[Optional[float], float]:
        """
        Extract monetary amount using multiple strategies.
        Priority: lines with 'total'/'amount' keywords → largest number near currency symbol → largest number overall.
        """
        candidates = []

        for line in lines:
            text = line.text
            text_lower = text.lower()

            # Strategy 1: Look for explicit total/amount keywords
            total_patterns = [
                r"(?:total|amount|sum|due|grand total|final|payable|balance due)[^\d]*?[$€£₹]?\s*([\d,]+\.?\d{0,2})",
                r"(?:total|amount|sum|due)[^\d]*?([\d,]+\.\d{2})",
            ]

            for pattern in total_patterns:
                matches = re.findall(pattern, text_lower, re.IGNORECASE)
                for match in matches:
                    val = self._parse_amount(match)
                    if val:
                        # Higher confidence if keyword + currency symbol present
                        has_currency = bool(re.search(r"[$€£₹]", text))
                        conf = line.confidence * (1.2 if has_currency else 1.0)
                        candidates.append((val, min(conf, 1.0), "keyword"))

            # Strategy 2: Currency symbol + number
            currency_pattern = r"[$€£₹]\s*([\d,]+\.?\d{0,2})"
            matches = re.findall(currency_pattern, text)
            for match in matches:
                val = self._parse_amount(match)
                if val:
                    candidates.append((val, line.confidence, "currency"))

            # Strategy 3: Any number with 2 decimal places (likely money)
            decimal_pattern = r"([\d,]+\.\d{2})"
            matches = re.findall(decimal_pattern, text)
            for match in matches:
                val = self._parse_amount(match)
                if val and val > 0.99:  # Filter out tiny values (prices, not totals)
                    candidates.append((val, line.confidence * 0.7, "decimal"))

        if not candidates:
            return None, 0.0

        # Sort by confidence, then by value (prefer larger amounts for totals)
        candidates.sort(key=lambda x: (x[1], x[0]), reverse=True)

        # Prefer "total" keyword matches, then currency, then decimal
        keyword_matches = [c for c in candidates if c[2] == "keyword"]
        if keyword_matches:
            best = max(keyword_matches, key=lambda x: x[1])
            return best[0], best[1]

        # Return highest confidence candidate
        return candidates[0][0], candidates[0][1]

    def _parse_amount(self, raw: str) -> Optional[float]:
        """Clean and parse amount string."""
        try:
            # Remove commas, spaces, currency symbols
            cleaned = re.sub(r"[^\d.]", "", raw.replace(",", ""))
            val = float(cleaned)
            # Sanity checks
            if 0 < val < 1e9:
                return round(val, 2)
            return None
        except (ValueError, TypeError):
            return None

    def _extract_date(self, lines: List[OCRLine]) -> Tuple[Optional[str], float]:
        """Extract and normalize date from OCR text."""
        date_patterns = [
            # MM/DD/YYYY or DD/MM/YYYY
            (r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", 0.9),
            # YYYY-MM-DD
            (r"(\d{4}[/-]\d{1,2}[/-]\d{1,2})", 0.95),
            # 15 June 2026
            (
                r"(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})",
                0.85,
            ),
            # June 15, 2026
            (
                r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})",
                0.85,
            ),
            # Date keyword + value
            (
                r"(?:date|dated|invoice date|transaction date)[:;\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
                1.0,
            ),
        ]

        for line in lines:
            for pattern, base_conf in date_patterns:
                matches = re.findall(pattern, line.text, re.IGNORECASE)
                for match in matches:
                    normalized = self._normalize_date(match)
                    if normalized:
                        conf = min(line.confidence * base_conf, 1.0)
                        return normalized, conf

        return None, 0.0

    def _normalize_date(self, date_str: str) -> Optional[str]:
        """Convert various date formats to ISO YYYY-MM-DD."""
        formats = [
            "%m/%d/%Y",
            "%m-%d-%Y",
            "%d/%m/%Y",
            "%d-%m-%Y",
            "%Y/%m/%d",
            "%Y-%m-%d",
            "%d %b %Y",
            "%d %B %Y",
            "%b %d %Y",
            "%B %d %Y",
            "%b %d, %Y",
            "%B %d, %Y",
        ]

        for fmt in formats:
            try:
                dt = datetime.strptime(date_str.strip(), fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
        return None

    def _extract_vendor(self, lines: List[OCRLine]) -> Tuple[Optional[str], float]:
        """
        Extract vendor/merchant name using heuristics.
        Strategy: Look for text in top portion of receipt, exclude stopwords, prefer capitalized words.
        """
        if not lines:
            return None, 0.0

        # Vendors usually appear in first 30% of lines
        top_lines = lines[: max(1, len(lines) // 3)]

        candidates = []

        # Strategy 1: Explicit vendor keyword
        vendor_keyword_pattern = r"(?:from|vendor|merchant|seller|store|billed by|invoice from|sold by)[:;\s]+([A-Z][A-Za-z0-9\s&.,]+)"
        for line in top_lines:
            matches = re.findall(vendor_keyword_pattern, line.text, re.IGNORECASE)
            for match in matches:
                cleaned = self._clean_vendor_name(match)
                if cleaned:
                    candidates.append((cleaned, line.confidence * 1.0, "keyword"))

        # Strategy 2: Capitalized words in top lines (likely business name)
        for line in top_lines:
            text = line.text.strip()
            # Skip short lines, lines with numbers only, stopwords
            if len(text) < 3 or text.isdigit() or text.lower() in self.VENDOR_STOPWORDS:
                continue

            # Check if mostly capitalized (business names usually are)
            words = text.split()
            if words and len(words) >= 1:
                capitalized_ratio = sum(1 for w in words if w[0].isupper()) / len(words)
                if capitalized_ratio >= 0.5 and not any(
                    sw in text.lower() for sw in self.VENDOR_STOPWORDS
                ):
                    cleaned = self._clean_vendor_name(text)
                    if cleaned and len(cleaned) > 2:
                        candidates.append(
                            (cleaned, line.confidence * 0.8, "capitalized")
                        )

        # Strategy 3: Longest capitalized word group in first few lines
        for line in top_lines[:3]:
            text = line.text
            # Find sequences of capitalized words
            cap_sequences = re.findall(r"([A-Z][a-zA-Z0-9\s&]{2,50})", text)
            for seq in cap_sequences:
                cleaned = self._clean_vendor_name(seq)
                if cleaned and len(cleaned) > 3:
                    candidates.append((cleaned, line.confidence * 0.6, "sequence"))

        if not candidates:
            return None, 0.0

        # Prefer keyword matches, then highest confidence
        keyword_matches = [c for c in candidates if c[2] == "keyword"]
        if keyword_matches:
            best = max(keyword_matches, key=lambda x: x[1])
            return best[0], best[1]

        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[0][0], candidates[0][1]

    def _clean_vendor_name(self, raw: str) -> Optional[str]:
        """Clean and validate vendor name."""
        cleaned = raw.strip()
        # Take first line if multiline
        cleaned = cleaned.split("\n")[0]
        # Remove trailing punctuation
        cleaned = re.sub(r"[^\w\s&.,-]+$", "", cleaned)
        # Remove common suffixes
        cleaned = re.sub(
            r"\s+(LLC|Inc|Ltd|Corp|GmbH|Co\.?|Company)\.?$", "", cleaned, flags=re.I
        )
        cleaned = cleaned.strip()

        if len(cleaned) < 2 or cleaned.lower() in self.VENDOR_STOPWORDS:
            return None
        return cleaned[:100]

    def _extract_transaction_type(
        self, lines: List[OCRLine]
    ) -> Tuple[Optional[str], float]:
        """Determine transaction type from keywords in text."""
        full_text = " ".join([l.text for l in lines]).lower()

        scores = {}
        for tx_type, keywords in self.TYPE_KEYWORDS.items():
            score = 0
            for kw in keywords:
                if kw in full_text:
                    score += 1
            if score > 0:
                scores[tx_type] = score

        if not scores:
            return None, 0.0

        # Return type with highest keyword match score
        best_type = max(scores, key=scores.get)
        confidence = min(0.5 + (scores[best_type] * 0.15), 0.95)
        return best_type, round(confidence, 3)

    # ─── Mock Mode ───────────────────────────────────────────────────────────

    def _generate_mock_lines(self, invoice_id: Optional[int] = None) -> List[OCRLine]:
        """Generate synthetic OCR lines for testing without EasyOCR."""
        rng = random.Random(invoice_id or random.randint(0, 99999))

        vendors = [
            "Acme Corporation",
            "Global Supplies Ltd",
            "TechSolutions Inc",
            "Metro Logistics",
            "Vertex Partners",
            "Nexus Industries",
            "Quantum Services",
            "Prime Holdings",
            "Apex Ventures",
            "Zenith Corp",
        ]
        amounts = [
            1250.00,
            4999.99,
            15000.00,
            750.50,
            25000.00,
            899.99,
            4500.00,
            120000.00,
            3400.00,
            8900.50,
        ]
        types = ["PAYMENT", "TRANSFER", "CASH_OUT", "CASH_IN", "DEBIT"]

        vendor = rng.choice(vendors)
        amount = rng.choice(amounts)
        tx_type = rng.choice(types)
        date = (datetime.now() - timedelta(days=rng.randint(1, 90))).strftime(
            "%m/%d/%Y"
        )
        inv_num = rng.randint(1000, 9999)

        mock_text = f"""INVOICE
Invoice #: INV-{inv_num}
Date: {date}
From: {vendor}
To: LedgerWatch Client

Description: Professional Services
Amount: ${amount:,.2f}
Payment Type: {tx_type.lower()}

Total Due: ${amount:,.2f} USD"""

        lines = []
        for i, text in enumerate(mock_text.split("\n")):
            if text.strip():
                lines.append(
                    OCRLine(
                        text=text.strip(),
                        confidence=0.95,
                        bbox=[
                            [0, i * 20],
                            [100, i * 20],
                            [100, i * 20 + 15],
                            [0, i * 20 + 15],
                        ],
                    )
                )
        return lines

    # ─── Public API Methods ───────────────────────────────────────────────────

    def parse_image(self, image_input: Union[str, Path, bytes]) -> OCRExtraction:
        """Parse image file or bytes."""
        lines = self.run_ocr(image_input)
        return self.extract_fields(lines)

    def parse_pdf(self, pdf_path: Union[str, Path]) -> OCRExtraction:
        """Parse PDF file."""
        lines = self.pdf_to_lines(pdf_path)
        return self.extract_fields(lines)

    def parse_text(self, text: str) -> OCRExtraction:
        """Parse pre-extracted text (useful for testing)."""
        lines = [
            OCRLine(text=t, confidence=1.0, bbox=[])
            for t in text.split("\n")
            if t.strip()
        ]
        return self.extract_fields(lines)

    def batch_parse(self, file_paths: List[Union[str, Path]]) -> List[OCRExtraction]:
        """Parse multiple files."""
        results = []
        for path in file_paths:
            path = Path(path)
            if path.suffix.lower() == ".pdf":
                results.append(self.parse_pdf(path))
            else:
                results.append(self.parse_image(path))
        return results


# ─── Synthetic Invoice Generator ─────────────────────────────────────────────


def generate_synthetic_invoice_image(
    output_path: str,
    amount: float = 5000.00,
    vendor: str = "Acme Corporation",
    date: str = None,
    tx_type: str = "TRANSFER",
    width: int = 800,
    height: int = 600,
) -> Path:
    """Generate a synthetic invoice image for testing."""
    if date is None:
        date = datetime.now().strftime("%m/%d/%Y")

    img = Image.new("RGB", (width, height), color="white")
    draw = ImageDraw.Draw(img)

    try:
        font_large = (
            ImageFont.truetype("DejaVuSans-Bold.ttf", 36) or ImageFont.load_default()
        )
        font_medium = (
            ImageFont.truetype("DejaVuSans.ttf", 24) or ImageFont.load_default()
        )
        font_small = (
            ImageFont.truetype("DejaVuSans.ttf", 18) or ImageFont.load_default()
        )
    except:
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_small = ImageFont.load_default()

    y = 40
    draw.text((width // 2 - 100, y), "INVOICE", fill="black", font=font_large)
    y += 60

    fields = [
        (f"Invoice #: INV-{abs(hash(vendor)) % 10000:04d}", font_small),
        (f"Date: {date}", font_medium),
        (f"From: {vendor}", font_medium),
        ("To: LedgerWatch AI Client", font_small),
        ("", font_small),
        ("Description: Professional Services", font_small),
        (f"Amount: ${amount:,.2f}", font_medium),
        (f"Payment Type: {tx_type}", font_small),
        ("", font_small),
        (f"Total Due: ${amount:,.2f} USD", font_large),
        ("Please remit within 30 days", font_small),
    ]

    for text, font in fields:
        if text:
            draw.text((50, y), text, fill="black", font=font)
        y += 35 if font == font_medium else 25

    output_path = Path(output_path)
    img.save(output_path)
    logger.info(f"Generated synthetic invoice: {output_path}")
    return output_path


# ─── CLI Entry Point ─────────────────────────────────────────────────────────


def main():
    """CLI for testing OCR on invoice files."""
    import argparse

    parser = argparse.ArgumentParser(
        description="LedgerWatch AI — Invoice OCR Parser (EasyOCR)"
    )
    parser.add_argument("file", nargs="?", help="Path to invoice PDF or image")
    parser.add_argument("--mock", action="store_true", help="Use mock mode")
    parser.add_argument("--generate", help="Generate synthetic invoice to path")
    parser.add_argument("--amount", type=float, default=5000.00)
    parser.add_argument("--vendor", default="Acme Corporation")
    parser.add_argument("--gpu", action="store_true", help="Use GPU (if available)")
    parser.add_argument("--output", help="Output JSON file path")
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Show raw OCR text"
    )

    args = parser.parse_args()

    if args.generate:
        path = generate_synthetic_invoice_image(
            args.generate, amount=args.amount, vendor=args.vendor
        )
        print(f"\nSynthetic invoice: {path}")
        print(f"Test: python src/ocr_service.py {path} --mock")
        return

    ocr = InvoiceOCR(gpu=args.gpu, mock_mode=args.mock)

    if args.file:
        path = Path(args.file)
        if path.suffix.lower() == ".pdf":
            result = ocr.parse_pdf(path)
        else:
            result = ocr.parse_image(path)
    else:
        result = ocr.parse_text("Mock invoice text for testing")

    print("\n" + "=" * 60)
    print("EASYOCR EXTRACTION RESULT")
    print("=" * 60)
    print(f"Amount:           {result.amount}")
    print(f"Date:             {result.date}")
    print(f"Vendor:           {result.vendor}")
    print(f"Transaction Type: {result.transaction_type}")
    print(f"Confidence:       {result.confidence}")
    print(f"Fields Found:     {result.metadata.get('fields_found', [])}")
    print(f"Fields Missing:   {result.metadata.get('fields_missing', [])}")
    print(f"Mock Mode:        {result.metadata.get('mock_mode', False)}")
    print(f"Lines Extracted:  {len(result.lines)}")
    print("=" * 60)

    if args.verbose:
        print("\n--- RAW OCR TEXT ---")
        print(result.raw_text[:2000])

    if args.output:
        with open(args.output, "w") as f:
            json.dump(result.to_dict(), f, indent=2)
        print(f"\nSaved: {args.output}")


if __name__ == "__main__":
    main()
