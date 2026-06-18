from PIL import Image, ImageDraw, ImageFont
import os
import random

def create_invoice(output_path, invoice_num, vendor, amount_str, is_anomalous=False):
    width, height = 600, 800
    image = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(image)

    try:
        font_title = ImageFont.truetype("arialbd.ttf", 40)
        font_text = ImageFont.truetype("arial.ttf", 24)
        font_amount = ImageFont.truetype("arialbd.ttf", 36)
    except IOError:
        font_title = ImageFont.load_default()
        font_text = ImageFont.load_default()
        font_amount = ImageFont.load_default()

    y_offset = 50
    draw.text((50, y_offset), f"INVOICE #{invoice_num}", fill="black", font=font_title)
    
    y_offset += 80
    draw.text((50, y_offset), f"VENDOR: {vendor}", fill="black", font=font_text)
    
    y_offset += 40
    date_str = f"DATE: 2026-06-{random.randint(10,25)} 10:00:00 AM"
    if is_anomalous:
        date_str = f"DATE: 2026-06-{random.randint(10,25)} 03:33:00 AM"
    draw.text((50, y_offset), date_str, fill="black", font=font_text)
    
    y_offset += 60
    draw.text((50, y_offset), "-" * 40, fill="black", font=font_text)
    
    y_offset += 40
    desc = "Consulting Fees" if is_anomalous else "General Supplies"
    draw.text((50, y_offset), desc, fill="black", font=font_text)
    draw.text((400, y_offset), amount_str, fill="black", font=font_text)
    
    y_offset += 60
    draw.text((50, y_offset), "-" * 40, fill="black", font=font_text)
    
    y_offset += 40
    draw.text((50, y_offset), "TOTAL AMOUNT DUE:", fill="black", font=font_amount)
    amount_color = "red" if is_anomalous else "black"
    draw.text((400, y_offset), amount_str, fill=amount_color, font=font_amount)
    
    y_offset += 80
    terms = "IMMEDIATE WIRE TRANSFER" if is_anomalous else "NET 30 DAYS"
    draw.text((50, y_offset), f"PAYMENT TERMS: {terms}", fill="black", font=font_text)

    image.save(output_path)
    print(f"Created: {output_path}")

if __name__ == "__main__":
    output_dir = "C:/Users/KRYPTON-BOOK/Desktop/invoices"
    os.makedirs(output_dir, exist_ok=True)
    
    # Normal data
    normal_vendors = ["Office Supplies Inc.", "City Coffee Shop", "Local IT Services", "Stationery Hub", "Caterers Extraordinaire"]
    
    # Generate 7 normal invoices
    for i in range(1, 8):
        vendor = random.choice(normal_vendors)
        amount = f"${random.randint(15, 250)}.00"
        path = os.path.join(output_dir, f"invoice_normal_{i}.png")
        create_invoice(path, 1000 + i, vendor, amount, is_anomalous=False)
        
    # Generate 3 anomalous invoices
    anomalous_data = [
        ("OFFSHORE SHELL CORP LTD", "$4,500,000.00"),
        ("UNKNOWN CRYPTO EXCHANGE", "$8,999,999.00"),
        ("CAYMAN ISLANDS HOLDINGS", "$1,250,000.00")
    ]
    for i, (vendor, amount) in enumerate(anomalous_data):
        path = os.path.join(output_dir, f"invoice_anomaly_{i+1}.png")
        create_invoice(path, 9990 + i, vendor, amount, is_anomalous=True)
