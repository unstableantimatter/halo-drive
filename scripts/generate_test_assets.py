from PIL import Image, ImageDraw, ImageFont
import os

def ensure_directories():
    """Create necessary asset directories if they don't exist"""
    directories = [
        'frontend/static/assets/ships',
        'frontend/static/assets/effects',
        'frontend/static/assets/ui',
        'frontend/static/assets/backgrounds'
    ]
    for directory in directories:
        os.makedirs(directory, exist_ok=True)

def create_ship_sprite():
    """Create a simple ship sprite"""
    size = (64, 64)
    image = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    
    # Draw ship body
    draw.ellipse([16, 16, 48, 48], fill=(50, 100, 255, 255))
    # Draw ship nose
    draw.polygon([(32, 10), (24, 40), (40, 40)], fill=(70, 120, 255, 255))
    
    image.save('frontend/static/assets/ships/ship_1.png')

def create_engine_flame():
    """Create an engine flame texture"""
    size = (32, 64)
    image = Image.new('RGBA', size, (0, 0, 0, 0))
    pixels = image.load()
    
    # Create gradient
    for y in range(size[1]):
        intensity = 1 - (y / size[1])
        for x in range(size[0]):
            # Yellow to red gradient
            r = int(255 * intensity)
            g = int(155 * intensity)
            b = int(50 * intensity)
            a = int(255 * intensity)
            pixels[x, y] = (r, g, b, a)
    
    image.save('frontend/static/assets/effects/engine_flame.png')

def create_logo():
    """Create a simple game logo"""
    size = (512, 512)
    image = Image.new('RGBA', size, (0, 0, 0, 255))
    draw = ImageDraw.Draw(image)
    
    # Try to use a system font, fallback to default
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 60)
    except:
        font = ImageFont.load_default()
    
    # Draw text
    draw.text((20, 40), 'HALO DRIVE', fill=(0, 150, 255, 255), font=font)
    
    image.save('frontend/static/assets/ui/logo.png')

def create_starfield_background():
    """Create a simple starfield background"""
    size = (1024, 1024)
    image = Image.new('RGBA', size, (0, 0, 20, 255))
    draw = ImageDraw.Draw(image)
    
    # Draw random stars
    import random
    for _ in range(200):
        x = random.randint(0, size[0])
        y = random.randint(0, size[1])
        radius = random.randint(1, 3)
        brightness = random.randint(150, 255)
        draw.ellipse([x-radius, y-radius, x+radius, y+radius], 
                    fill=(brightness, brightness, brightness, 255))
    
    image.save('frontend/static/assets/backgrounds/starfield.png')

def create_nebula_background():
    """Create a simple nebula effect"""
    size = (512, 512)
    image = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    
    # Create cloudy effect
    import random
    for _ in range(50):
        x = random.randint(0, size[0])
        y = random.randint(0, size[1])
        radius = random.randint(20, 100)
        r = random.randint(0, 100)
        g = random.randint(0, 100)
        b = random.randint(100, 255)
        a = random.randint(30, 100)
        draw.ellipse([x-radius, y-radius, x+radius, y+radius], 
                    fill=(r, g, b, a))
    
    image.save('frontend/static/assets/backgrounds/nebula.png')

def main():
    """Generate all test assets"""
    print("Generating test assets...")
    ensure_directories()
    create_ship_sprite()
    create_engine_flame()
    create_logo()
    create_starfield_background()
    create_nebula_background()
    print("Test assets generated successfully!")

if __name__ == "__main__":
    main() 