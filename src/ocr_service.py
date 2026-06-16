"""
src/ocr_service.py — OCR-powered invoice parser for LedgerWatch AI

Converts invoice PDFs → structured transaction data using Tesseract + regex.
Includes MOCK mode for testing without Tesseract installed.
"""

import io
import json
import logging
import os
import re
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pytesseract
from pdf2image import convert_from_path
from PIL import Image, ImageDraw, ImageFont

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger(__name__)


@dataclass
class OCRExtraction:
    """Structured output from invoice OCR — maps to TransactionCreate schema."""

    amount: Optional[float] = None
    date: Optional[str] = None  # ISO format YYYY-MM-DD
    vendor: Optional[str] = None
    transaction_type: Optional[str] = None  # PAYMENT, TRANSFER, CASH_OUT, etc.
    confidence: float = 0.0  # 0-1 aggregate confidence
    raw_text: str = ""  # Full OCR text for debugging
    metadata: Dict[str, Any] = None  # Extra extracted fields

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}

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
        """Full dict export including metadata."""
        return {
            "amount": self.amount,
            "date": self.date,
            "vendor": self.vendor,
            "transaction_type": self.transaction_type,
            "confidence": self.confidence,
            "raw_text": (
                self.raw_text[:500] + "..."
                if len(self.raw_text) > 500
                else self.raw_text
            ),
            "metadata": self.metadata,
        }


class InvoiceOCR:
    """
    OCR service for parsing invoice PDFs into structured transaction data.

    Uses Tesseract for text extraction + regex patterns for field parsing.
    Falls back to MOCK mode if Tesseract is not installed.
    """

    # ✅ FIX: Improved regex patterns for better amount extraction
    PATTERNS = {
        "amount": [
            # "Amount: $5,000.00" or "Total Due: $5,000.00"
            r"(?:amount|total|sum|due|payment|total due)[^\d]*?[$€£]?\s*([\d,]+\.?\d{0,2})",
            # "$5,000.00" standalone
            r"[$€£]\s*([\d,]+\.?\d{0,2})",
            # "5,000.00 USD"
            r"([\d,]+\.?\d{0,2})\s*(?:USD|EUR|GBP)",
            # "5000.00" at end of line
            r"([\d,]+\.\d{2})\s*$",
        ],
        "date": [
            r"(?:date|dated|invoice date)[^\d]*?(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            r"(?:date|dated)[^\d]*?(\d{4}[/-]\d{1,2}[/-]\d{1,2})",
            r"(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})",
            r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})",
        ],
        "vendor": [
            r"(?:from|vendor|seller|billed by|invoice from|merchant)[:;\s]+([A-Z][A-Za-z0-9\s&.,]+)",
            r"(?:company|vendor|merchant)[:;\s]+([A-Z][A-Za-z0-9\s&.,]{3,50})",
        ],
        "transaction_type": [
            r"(?:type|payment type|method)[:;\s]+(transfer|cash|payment|deposit|withdrawal)",
            r"(?:wire|bank|ach|credit|debit|check|cash)",
        ],
    }

    def __init__(
        self,
        tesseract_cmd: Optional[str] = None,
        dpi: int = 300,
        mock_mode: bool = False,
    ):
        """
        Initialize OCR service.

        Args:
            tesseract_cmd: Path to tesseract executable (if not in PATH)
            dpi: Resolution for PDF-to-image conversion
            mock_mode: If True, skip Tesseract and use synthetic text for testing
        """
        self.dpi = dpi
        self.mock_mode = mock_mode
        self.tesseract_available = False

        if not mock_mode:
            if tesseract_cmd:
                pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
            self.tesseract_available = self._check_tesseract()

        if mock_mode:
            logger.info(
                "MOCK MODE: Using synthetic invoice generation (no Tesseract needed)"
            )

    def _check_tesseract(self) -> bool:
        """Verify Tesseract is installed and accessible."""
        try:
            version = pytesseract.get_tesseract_version()
            logger.info(f"Tesseract OCR v{version} ready")
            return True
        except Exception as e:
            logger.warning(f"Tesseract not found: {e}")
            logger.warning("Falling back to MOCK mode — install Tesseract for real OCR")
            logger.warning("  Windows: https://github.com/UB-Mannheim/tesseract/wiki")
            logger.warning("  Mac: brew install tesseract")
            logger.warning("  Linux: sudo apt install tesseract-ocr")
            return False

    def pdf_to_text(self, pdf_path: str | Path) -> str:
        """
        Convert PDF to text via OCR (or mock).

        Args:
            pdf_path: Path to invoice PDF

        Returns:
            Extracted text string
        """
        if self.mock_mode or not self.tesseract_available:
            logger.info("Using mock invoice text (no real OCR)")
            return self._generate_mock_invoice_text()

        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        logger.info(f"Converting PDF to images: {pdf_path.name}")
        images = convert_from_path(str(pdf_path), dpi=self.dpi)

        logger.info(f"OCR on {len(images)} page(s)...")
        texts = []
        for i, image in enumerate(images):
            text = pytesseract.image_to_string(image)
            texts.append(text)
            logger.debug(f"Page {i+1}: {len(text)} chars extracted")

        full_text = "\n".join(texts)
        logger.info(f"OCR complete: {len(full_text)} characters")
        return full_text

    def image_to_text(self, image_path: str | Path) -> str:
        """
        OCR on a single image file (or mock).

        Args:
            image_path: Path to image (PNG, JPG, etc.)

        Returns:
            Extracted text string
        """
        if self.mock_mode or not self.tesseract_available:
            return self._generate_mock_invoice_text()

        image_path = Path(image_path)
        if not image_path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")

        image = Image.open(image_path)
        text = pytesseract.image_to_string(image)
        logger.info(f"OCR on image: {len(text)} characters")
        return text

    def _generate_mock_invoice_text(self, invoice_id: Optional[int] = None) -> str:
        """Generate synthetic invoice text for testing without Tesseract."""
        import random

        rng = random.Random(
            invoice_id if invoice_id is not None else random.randint(0, 99999)
        )

        vendors = [
            "Acme Corp",
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

        templates = [
            f"""INVOICE
Invoice #: INV-{inv_num}
Date: {date}
From: {vendor}
To: LedgerWatch Client

Description: Professional Services
Amount: ${amount:,.2f}
Payment Type: {tx_type.lower()}

Total Due: ${amount:,.2f} USD""",
            f"""BILLING STATEMENT
Vendor: {vendor}
Date Issued: {date}
Account: ****{rng.randint(1000,9999)}

Service Charge: ${amount:,.2f}
Tax: $0.00
Total Amount: ${amount:,.2f}

Payment Method: {tx_type.lower()}
Please remit by {date}""",
            f"""RECEIPT
Transaction Date: {date}
Merchant: {vendor}
Amount: ${amount:,.2f}
Type: {tx_type}

Thank you for your business!""",
        ]

        return rng.choice(templates)

    def extract_fields(self, text: str) -> OCRExtraction:
        """
        Parse structured fields from OCR text using regex.

        Args:
            text: Raw OCR text

        Returns:
            OCRExtraction with parsed fields and confidence scores
        """
        extraction = OCRExtraction(raw_text=text)
        field_scores = {}

        # Extract amount
        amount, amount_conf = self._extract_with_patterns(text, "amount")
        if amount:
            extraction.amount = amount
            field_scores["amount"] = amount_conf

        # Extract date
        date_str, date_conf = self._extract_with_patterns(text, "date")
        if date_str:
            extraction.date = self._normalize_date(date_str)
            field_scores["date"] = date_conf

        # Extract vendor
        vendor, vendor_conf = self._extract_with_patterns(text, "vendor")
        if vendor:
            extraction.vendor = vendor.strip()[:100]
            field_scores["vendor"] = vendor_conf

        # Extract transaction type
        tx_type, tx_conf = self._extract_with_patterns(text, "transaction_type")
        if tx_type:
            extraction.transaction_type = tx_type.upper()
            field_scores["transaction_type"] = tx_conf

        # Calculate aggregate confidence
        if field_scores:
            extraction.confidence = round(
                sum(field_scores.values()) / len(field_scores), 3
            )

        extraction.metadata = {
            "field_scores": field_scores,
            "fields_found": list(field_scores.keys()),
            "fields_missing": [
                f
                for f in ["amount", "date", "vendor", "transaction_type"]
                if f not in field_scores
            ],
            "text_length": len(text),
            "word_count": len(text.split()),
            "mock_mode": self.mock_mode or not self.tesseract_available,
        }

        logger.info(
            f"Extracted {len(field_scores)}/4 fields, confidence: {extraction.confidence}"
        )
        return extraction

    def _extract_with_patterns(
        self, text: str, field: str
    ) -> Tuple[Optional[Any], float]:
        """
        Try multiple regex patterns for a field. Return best match + confidence.
        """
        patterns = self.PATTERNS.get(field, [])
        text_lower = text.lower()

        for i, pattern in enumerate(patterns):
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            if matches:
                raw = matches[0] if isinstance(matches[0], str) else matches[0][0]
                cleaned = self._clean_field(field, raw)
                if cleaned:
                    confidence = round(1.0 - (i * 0.15), 2)
                    return cleaned, confidence

        return None, 0.0

    def _clean_field(self, field: str, raw: str) -> Optional[Any]:
        """Clean and validate extracted field values."""
        raw = raw.strip()

        if field == "amount":
            # ✅ FIX: Properly handle comma-separated amounts
            # Remove $, €, £, commas, spaces
            cleaned = re.sub(r"[^\d.]", "", raw.replace(",", ""))
            try:
                val = float(cleaned)
                return val if val > 0 and val < 1e9 else None
            except ValueError:
                return None

        elif field == "date":
            return raw
        elif field == "vendor":
            # Split on newline first — regex sometimes captures across lines
            cleaned = raw.split("\n")[0]
            cleaned = re.sub(r"[^\w\s&.,-]", "", cleaned)
            return cleaned.strip() if len(cleaned) > 2 else None

        elif field == "transaction_type":
            type_map = {
                "transfer": "TRANSFER",
                "wire": "TRANSFER",
                "cash": "CASH_OUT",
                "payment": "PAYMENT",
                "deposit": "CASH_IN",
                "withdrawal": "CASH_OUT",
                "credit": "CASH_IN",
                "debit": "CASH_OUT",
                "check": "PAYMENT",
                "ach": "TRANSFER",
            }
            return type_map.get(raw.lower(), "PAYMENT")

        return raw

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

    def parse_invoice(self, pdf_path: str | Path) -> OCRExtraction:
        """Full pipeline: PDF → OCR → structured extraction."""
        text = self.pdf_to_text(pdf_path)
        return self.extract_fields(text)

    def parse_image(self, image_path: str | Path) -> OCRExtraction:
        """Full pipeline: Image → OCR → structured extraction."""
        text = self.image_to_text(image_path)
        return self.extract_fields(text)

    def parse_text(self, text: str) -> OCRExtraction:
        """Parse pre-extracted text directly (useful for testing)."""
        return self.extract_fields(text)

    def batch_parse(self, file_paths: List[str | Path]) -> List[OCRExtraction]:
        """Parse multiple invoices/images."""
        results = []
        for path in file_paths:
            path = Path(path)
            if path.suffix.lower() == ".pdf":
                results.append(self.parse_invoice(path))
            else:
                results.append(self.parse_image(path))
        return results


# ─── Synthetic Invoice Generator for Testing ───────────────────────────────────


def generate_synthetic_invoice_image(
    output_path: str,
    amount: float = 5000.00,
    vendor: str = "Acme Corporation",
    date: str = "06/15/2026",
    tx_type: str = "TRANSFER",
    width: int = 800,
    height: int = 600,
) -> Path:
    """
    Generate a synthetic invoice image for testing OCR without real invoices.

    Args:
        output_path: Where to save the PNG
        amount: Invoice amount
        vendor: Vendor name
        date: Invoice date
        tx_type: Transaction type
        width: Image width
        height: Image height

    Returns:
        Path to generated image
    """
    img = Image.new("RGB", (width, height), color="white")
    draw = ImageDraw.Draw(img)

    # Try to use a nice font, fall back to default
    try:
        font_large = ImageFont.truetype("arial.ttf", 36)
        font_medium = ImageFont.truetype("arial.ttf", 24)
        font_small = ImageFont.truetype("arial.ttf", 18)
    except:
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_small = ImageFont.load_default()

    # Draw invoice content
    y = 40
    draw.text((width // 2 - 150, y), "INVOICE", fill="black", font=font_large)
    y += 60

    draw.text(
        (50, y),
        f"Invoice #: INV-{hash(vendor) % 10000:04d}",
        fill="black",
        font=font_small,
    )
    y += 30
    draw.text((50, y), f"Date: {date}", fill="black", font=font_medium)
    y += 40
    draw.text((50, y), f"From: {vendor}", fill="black", font=font_medium)
    y += 40
    draw.text((50, y), "To: LedgerWatch AI Client", fill="black", font=font_small)
    y += 50

    # Draw line
    draw.line((50, y, width - 50, y), fill="black", width=2)
    y += 20

    draw.text(
        (50, y), "Description: Professional Services", fill="black", font=font_small
    )
    y += 30
    draw.text((50, y), f"Amount: ${amount:,.2f}", fill="black", font=font_medium)
    y += 30
    draw.text((50, y), f"Payment Type: {tx_type}", fill="black", font=font_small)
    y += 40

    # Draw line
    draw.line((50, y, width - 50, y), fill="black", width=2)
    y += 20

    draw.text((50, y), f"Total Due: ${amount:,.2f} USD", fill="black", font=font_large)
    y += 40
    draw.text((50, y), "Please remit within 30 days", fill="gray", font=font_small)

    output_path = Path(output_path)
    img.save(output_path)
    logger.info(f"Generated synthetic invoice: {output_path}")
    return output_path


# ─── CLI Entry Point ───────────────────────────────────────────────────────────


def main():
    """CLI for testing OCR on invoice files."""
    import argparse

    parser = argparse.ArgumentParser(description="LedgerWatch AI — Invoice OCR Parser")
    parser.add_argument("file", nargs="?", help="Path to invoice PDF or image")
    parser.add_argument(
        "--mock", action="store_true", help="Use mock mode (no Tesseract needed)"
    )
    parser.add_argument(
        "--generate", help="Generate synthetic invoice image to this path"
    )
    parser.add_argument(
        "--amount", type=float, default=5000.00, help="Amount for synthetic invoice"
    )
    parser.add_argument(
        "--vendor", default="Acme Corporation", help="Vendor for synthetic invoice"
    )
    parser.add_argument("--tesseract", help="Path to tesseract executable")
    parser.add_argument("--dpi", type=int, default=300, help="OCR resolution")
    parser.add_argument("--output", help="Output JSON file path")
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Show raw OCR text"
    )

    args = parser.parse_args()

    # Generate synthetic invoice if requested
    if args.generate:
        path = generate_synthetic_invoice_image(
            args.generate,
            amount=args.amount,
            vendor=args.vendor,
        )
        print(f"\nSynthetic invoice generated: {path}")
        print(f"Now test with: python src/ocr_service.py {path} --mock")
        return

    # Initialize OCR
    ocr = InvoiceOCR(tesseract_cmd=args.tesseract, dpi=args.dpi, mock_mode=args.mock)

    if args.file:
        path = Path(args.file)
        if path.suffix.lower() in [".pdf"]:
            result = ocr.parse_invoice(path)
        else:
            result = ocr.parse_image(path)
    else:
        # Demo mode: parse mock text
        result = ocr.parse_text(ocr._generate_mock_invoice_text())

    # Print results
    print("\n" + "=" * 60)
    print("OCR EXTRACTION RESULT")
    print("=" * 60)
    print(f"Amount:           {result.amount}")
    print(f"Date:             {result.date}")
    print(f"Vendor:           {result.vendor}")
    print(f"Transaction Type: {result.transaction_type}")
    print(f"Confidence:       {result.confidence}")
    print(f"Fields Found:     {result.metadata['fields_found']}")
    print(f"Fields Missing:   {result.metadata['fields_missing']}")
    print(f"Mock Mode:        {result.metadata.get('mock_mode', False)}")
    print("=" * 60)

    if args.verbose:
        print("\n--- RAW OCR TEXT ---")
        print(
            result.raw_text[:2000] + "..."
            if len(result.raw_text) > 2000
            else result.raw_text
        )

    # Save to JSON if requested
    if args.output:
        with open(args.output, "w") as f:
            json.dump(result.to_dict(), f, indent=2)
        print(f"\nSaved to: {args.output}")


if __name__ == "__main__":
    main()
