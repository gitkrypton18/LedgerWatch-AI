"""
src/ocr_service.py — OCR-powered invoice/receipt parser for LedgerWatch AI
Uses Tesseract (lightweight, ~100MB RAM) — Render free tier compatible.
"""

import io
import json
import logging
import os
import random
import re
import tempfile
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

from PIL import Image, ImageDraw, ImageFont

# Tesseract OCR — lightweight, no heavy ML models
try:
    import pytesseract

    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    pytesseract = None
    logging.warning("pytesseract not installed — OCR will use mock mode")

# PDF support
try:
    import pymupdf

    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    pymupdf = None

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# ─── Data Models ─────────────────────────────────────────────────────────────


@dataclass
class OCRLine:
    """Single line of OCR output."""

    text: str
    confidence: float = 1.0
    bbox: List[List[float]] = field(default_factory=list)


@dataclass
class OCRExtraction:
    """Structured output from invoice/receipt OCR."""

    amount: Optional[float] = None
    date: Optional[str] = None
    vendor: Optional[str] = None
    transaction_type: Optional[str] = "PAYMENT"
    confidence: float = 0.0
    raw_text: str = ""
    lines: List[OCRLine] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_transaction_dict(self) -> Dict[str, Any]:
        return {
            "amount": self.amount,
            "date": self.date,
            "vendor": self.vendor,
            "type": self.transaction_type or "PAYMENT",
            "confidence": self.confidence,
            "source": "ocr_invoice",
        }

    def to_dict(self) -> Dict[str, Any]:
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


# ─── Tesseract OCR Service ──────────────────────────────────────────────────


class InvoiceOCR:
    """
    Lightweight OCR using Tesseract.
    Render free tier compatible (~100MB RAM).
    """

    TYPE_KEYWORDS = {
        "PAYMENT": ["payment", "paid", "pay", "credit card", "debit card", "purchase"],
        "TRANSFER": ["transfer", "wire", "ach", "bank transfer", "sent", "received"],
        "CASH_OUT": ["cash out", "withdrawal", "atm", "cash", "withdraw"],
        "CASH_IN": ["cash in", "deposit", "credit", "top up", "load"],
        "DEBIT": ["debit", "deduction", "charge", "fee", "subscription"],
    }

    VENDOR_STOPWORDS = {
        "invoice",
        "receipt",
        "bill",
        "statement",
        "total",
        "amount",
        "date",
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
        "thank",
        "please",
        "contact",
        "phone",
        "email",
        "website",
        "www",
        "http",
    }

    def __init__(self, mock_mode: bool = False, dpi: int = 300):
        self.mock_mode = mock_mode
        self.dpi = dpi
        # Check if tesseract binary is actually in PATH
        if not mock_mode and TESSERACT_AVAILABLE:
            try:
                import subprocess

                result = subprocess.run(
                    ["tesseract", "--version"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                )
                if result.returncode != 0:
                    logger.warning(
                        "Tesseract binary not found — falling back to mock mode"
                    )
                    self.mock_mode = True
                else:
                    logger.info(f"Tesseract found: {result.stdout.splitlines()[0]}")
            except Exception as e:
                logger.warning(
                    f"Tesseract check failed: {e} — falling back to mock mode"
                )
                self.mock_mode = True

    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """Preprocess image for better OCR."""
        image = image.convert("L")
        w, h = image.size
        if w < 800:
            ratio = 800 / w
            image = image.resize((800, int(h * ratio)), Image.LANCZOS)
        if w > 3000:
            ratio = 3000 / w
            image = image.resize((3000, int(h * ratio)), Image.LANCZOS)
        return image

    def run_ocr(
        self, image_input: Union[str, Path, bytes, Image.Image]
    ) -> List[OCRLine]:
        """Run OCR on image."""
        if self.mock_mode:
            return self._generate_mock_lines()

        if isinstance(image_input, (str, Path)):
            image = Image.open(image_input)
        elif isinstance(image_input, bytes):
            image = Image.open(io.BytesIO(image_input))
        elif isinstance(image_input, Image.Image):
            image = image_input
        else:
            raise ValueError(f"Unsupported input type: {type(image_input)}")

        image = self._preprocess_image(image)

        try:
            custom_config = r'--oem 3 --psm 4'
            text = pytesseract.image_to_string(image, lang="eng", config=custom_config)
            lines = []
            for i, line_text in enumerate(text.split("\n")):
                line_text = line_text.strip()
                if line_text:
                    lines.append(OCRLine(text=line_text, confidence=0.9))
            logger.info(f"OCR extracted {len(lines)} lines")
            return lines
        except Exception as e:
            logger.error(f"OCR failed: {e}")
            raise

    def pdf_to_lines(self, pdf_path: Union[str, Path]) -> List[OCRLine]:
        """Convert PDF to images using PyMuPDF, then OCR."""
        if not PYMUPDF_AVAILABLE:
            raise RuntimeError("pymupdf not installed")
        if self.mock_mode:
            return self._generate_mock_lines()

        all_lines = []
        doc = pymupdf.open(str(pdf_path))
        try:
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                pix = page.get_pixmap(dpi=self.dpi)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                img = self._preprocess_image(img)
                
                custom_config = r'--oem 3 --psm 4'
                text = pytesseract.image_to_string(img, lang="eng", config=custom_config)
                for line_text in text.split("\n"):
                    line_text = line_text.strip()
                    if line_text:
                        all_lines.append(OCRLine(text=line_text, confidence=0.9))
        finally:
            doc.close()
        return all_lines

    def extract_fields(self, lines: List[OCRLine]) -> OCRExtraction:
        """Parse structured fields from OCR lines."""
        full_text = " ".join([l.text for l in lines])
        extraction = OCRExtraction(raw_text=full_text, lines=lines)

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

        confs = [v for k, v in extraction.metadata.items() if k.endswith("_confidence")]
        if confs:
            extraction.confidence = round(sum(confs) / len(confs), 3)

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
                "mock_mode": self.mock_mode,
            }
        )

        return extraction

    def _extract_amount(self, lines: List[OCRLine]) -> Tuple[Optional[float], float]:
        """Extract monetary amount."""
        candidates = []
        for line in lines:
            text = line.text
            text_lower = text.lower()

            total_patterns = [
                r"(?:total|amount|sum|due|grand total|final)[^\d]*?[$€£₹]?\s*([\d,]+\.?\d{0,2})",
                r"(?:total|amount|sum|due)[^\d]*?([\d,]+\.\d{2})",
            ]
            for pattern in total_patterns:
                matches = re.findall(pattern, text_lower, re.IGNORECASE)
                for match in matches:
                    val = self._parse_amount(match)
                    if val:
                        has_currency = bool(re.search(r"[$€£₹]", text))
                        conf = 1.0 if has_currency else 0.9
                        candidates.append((val, conf, "keyword"))

            currency_pattern = r"[$€£₹]\s*([\d,]+\.?\d{0,2})"
            matches = re.findall(currency_pattern, text)
            for match in matches:
                val = self._parse_amount(match)
                if val:
                    candidates.append((val, 0.9, "currency"))

            decimal_pattern = r"([\d,]+\.\d{2})"
            matches = re.findall(decimal_pattern, text)
            for match in matches:
                val = self._parse_amount(match)
                if val and val > 0.99:
                    candidates.append((val, 0.7, "decimal"))

        if not candidates:
            return None, 0.0

        candidates.sort(key=lambda x: (x[1], x[0]), reverse=True)
        keyword_matches = [c for c in candidates if c[2] == "keyword"]
        if keyword_matches:
            best = max(keyword_matches, key=lambda x: x[1])
            return best[0], best[1]
        return candidates[0][0], candidates[0][1]

    def _parse_amount(self, raw: str) -> Optional[float]:
        try:
            cleaned = re.sub(r"[^\d.]", "", raw.replace(",", ""))
            val = float(cleaned)
            if 0 < val < 1e9:
                return round(val, 2)
            return None
        except (ValueError, TypeError):
            return None

    def _extract_date(self, lines: List[OCRLine]) -> Tuple[Optional[str], float]:
        date_patterns = [
            (r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", 0.9),
            (r"(\d{4}[/-]\d{1,2}[/-]\d{1,2})", 0.95),
            (
                r"(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})",
                0.85,
            ),
            (
                r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})",
                0.85,
            ),
            (r"(?:date|dated|invoice date)[:;\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", 1.0),
        ]

        for line in lines:
            for pattern, base_conf in date_patterns:
                matches = re.findall(pattern, line.text, re.IGNORECASE)
                for match in matches:
                    normalized = self._normalize_date(match)
                    if normalized:
                        return normalized, min(base_conf, 1.0)
        return None, 0.0

    def _normalize_date(self, date_str: str) -> Optional[str]:
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
        if not lines:
            return None, 0.0

        top_lines = lines[: max(1, len(lines) // 3)]
        candidates = []

        vendor_keyword_pattern = r"(?:from|vendor|merchant|seller|store|billed by|invoice from)[:;\s]+([A-Z][A-Za-z0-9\s&.,]+)"
        for line in top_lines:
            matches = re.findall(vendor_keyword_pattern, line.text, re.IGNORECASE)
            for match in matches:
                cleaned = self._clean_vendor_name(match)
                if cleaned:
                    candidates.append((cleaned, 1.0, "keyword"))

        for line in top_lines:
            text = line.text.strip()
            if len(text) < 3 or text.isdigit() or text.lower() in self.VENDOR_STOPWORDS:
                continue
            words = text.split()
            if words and len(words) >= 1:
                capitalized_ratio = sum(1 for w in words if w[0].isupper()) / len(words)
                if capitalized_ratio >= 0.5 and not any(
                    sw in text.lower() for sw in self.VENDOR_STOPWORDS
                ):
                    cleaned = self._clean_vendor_name(text)
                    if cleaned and len(cleaned) > 2:
                        candidates.append((cleaned, 0.8, "capitalized"))

        if not candidates:
            return None, 0.0

        keyword_matches = [c for c in candidates if c[2] == "keyword"]
        if keyword_matches:
            best = max(keyword_matches, key=lambda x: x[1])
            return best[0], best[1]

        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[0][0], candidates[0][1]

    def _clean_vendor_name(self, raw: str) -> Optional[str]:
        cleaned = raw.strip().split("\n")[0]
        cleaned = re.sub(r"[^\w\s&.,-]+$", "", cleaned)
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
        full_text = " ".join([l.text for l in lines]).lower()
        scores = {}
        for tx_type, keywords in self.TYPE_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in full_text)
            if score > 0:
                scores[tx_type] = score
        if not scores:
            return None, 0.0
        best_type = max(scores, key=scores.get)
        confidence = min(0.5 + (scores[best_type] * 0.15), 0.95)
        return best_type, round(confidence, 3)

    def _generate_mock_lines(self, invoice_id: Optional[int] = None) -> List[OCRLine]:
        rng = random.Random(invoice_id or random.randint(0, 99999))
        vendors = [
            "Acme Corp",
            "Global Supplies",
            "TechSolutions",
            "Metro Logistics",
            "Vertex Partners",
        ]
        amounts = [1250.00, 4999.99, 15000.00, 750.50, 25000.00]
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
Amount: ${amount:,.2f}
Payment Type: {tx_type.lower()}
Total Due: ${amount:,.2f} USD"""

        lines = []
        for i, text in enumerate(mock_text.split("\n")):
            if text.strip():
                lines.append(OCRLine(text=text.strip(), confidence=0.95))
        return lines

    def parse_image(self, image_input: Union[str, Path, bytes]) -> OCRExtraction:
        lines = self.run_ocr(image_input)
        return self.extract_fields(lines)

    def parse_pdf(self, pdf_path: Union[str, Path]) -> OCRExtraction:
        lines = self.pdf_to_lines(pdf_path)
        return self.extract_fields(lines)

    def parse_text(self, text: str) -> OCRExtraction:
        lines = [OCRLine(text=t, confidence=1.0) for t in text.split("\n") if t.strip()]
        return self.extract_fields(lines)

    def batch_parse(self, file_paths: List[Union[str, Path]]) -> List[OCRExtraction]:
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
    import argparse

    parser = argparse.ArgumentParser(
        description="LedgerWatch AI — Invoice OCR Parser (Tesseract)"
    )
    parser.add_argument("file", nargs="?", help="Path to invoice PDF or image")
    parser.add_argument("--mock", action="store_true", help="Use mock mode")
    parser.add_argument("--generate", help="Generate synthetic invoice to path")
    parser.add_argument("--amount", type=float, default=5000.00)
    parser.add_argument("--vendor", default="Acme Corporation")
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

    ocr = InvoiceOCR(mock_mode=args.mock)

    if args.file:
        path = Path(args.file)
        if path.suffix.lower() == ".pdf":
            result = ocr.parse_pdf(path)
        else:
            result = ocr.parse_image(path)
    else:
        result = ocr.parse_text("Mock invoice text for testing")

    print("\n" + "=" * 60)
    print("TESSERACT OCR EXTRACTION RESULT")
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
