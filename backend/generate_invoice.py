from PIL import Image, ImageDraw, ImageFont
import os

def create_anomalous_invoice(output_path):
    # Create a white background image
    width, height = 600, 800
    image = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(image)

    # We will use the default font since we don't know what fonts are installed
    # Default font is very small, so we might need to draw it larger or use a basic font
    try:
        # Try to load a standard Windows font
        font_title = ImageFont.truetype("arialbd.ttf", 40)
        font_text = ImageFont.truetype("arial.ttf", 24)
        font_amount = ImageFont.truetype("arialbd.ttf", 36)
    except IOError:
        font_title = ImageFont.load_default()
        font_text = ImageFont.load_default()
        font_amount = ImageFont.load_default()

    # Draw text
    y_offset = 50
    draw.text((50, y_offset), "INVOICE #999999", fill="black", font=font_title)
    
    y_offset += 80
    draw.text((50, y_offset), "VENDOR: OFFSHORE SHELL CORP LTD", fill="black", font=font_text)
    
    y_offset += 40
    draw.text((50, y_offset), "DATE: 2026-06-18 03:00:00 AM", fill="black", font=font_text)
    
    y_offset += 60
    draw.text((50, y_offset), "-" * 40, fill="black", font=font_text)
    
    y_offset += 40
    draw.text((50, y_offset), "Consulting Fees (Cayman Islands)", fill="black", font=font_text)
    draw.text((450, y_offset), "$4,500,000.00", fill="black", font=font_text)
    
    y_offset += 40
    draw.text((50, y_offset), "Server Maintenance (Crypto)", fill="black", font=font_text)
    draw.text((450, y_offset), "$5,499,999.00", fill="black", font=font_text)
    
    y_offset += 60
    draw.text((50, y_offset), "-" * 40, fill="black", font=font_text)
    
    y_offset += 40
    draw.text((50, y_offset), "TOTAL AMOUNT DUE:", fill="black", font=font_amount)
    draw.text((400, y_offset), "$9,999,999.00", fill="red", font=font_amount)
    
    y_offset += 80
    draw.text((50, y_offset), "PAYMENT TERMS: IMMEDIATE WIRE TRANSFER", fill="black", font=font_text)

    # Save the image
    image.save(output_path)
    print(f"Created anomalous invoice at: {output_path}")

if __name__ == "__main__":
    output = "f:/ML PROJECT/LedgerWatch-AI/LedgerWatch-AI/anomalous_invoice_test.png"
    create_anomalous_invoice(output)
