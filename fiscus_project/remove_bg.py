import sys

from PIL import Image


def remove_background(filepath):
    try:
        img = Image.open(filepath).convert("RGBA")
        datas = img.getdata()
        
        newData = []
        for item in datas:
            # Check if pixel is dark (black-ish background)
            if item[0] < 30 and item[1] < 30 and item[2] < 30:
                newData.append((255, 255, 255, 0)) # transparent
            else:
                newData.append(item)
                
        img.putdata(newData)
        img.save(filepath, "PNG")
        print(f"Processed {filepath}")
    except Exception as e:
        print(f"Failed {filepath}: {e}")

assets = [
    r"d:\Projects\Diploma-Project\fiscus_project\frontend\assets\game_basket.png",
    r"d:\Projects\Diploma-Project\fiscus_project\frontend\assets\game_good_product.png",
    r"d:\Projects\Diploma-Project\fiscus_project\frontend\assets\game_bad_product.png",
]

for p in assets:
    remove_background(p)
