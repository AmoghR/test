from pathlib import Path
from PIL import Image

def init_image_path(image_path: Path, thumbnail_path: Path):
    if not image_path.exists():
        print("Image path does not exist")
        return
    if not thumbnail_path.exists():
        thumbnail_path.mkdir()
    
    for file in image_path.iterdir():
        if file.is_file():
            thumbnail_file = thumbnail_path.joinpath(file.name)
            if thumbnail_file.exists():
                continue
            img = Image.open(file)
            img.thumbnail((200, 200), Image.Resampling.LANCZOS)
            img.save(thumbnail_file)
    
if __name__ == "__main__":
    DATA_DIRECTORY = Path(__file__).parent / ".." / "data"
    POSTCARDS_IMAGE_PATH = DATA_DIRECTORY /  "images_full_res"
    POSTCARDS_THUMBNAIL_PATH = DATA_DIRECTORY /  "thumbnails"
    init_image_path(POSTCARDS_IMAGE_PATH, POSTCARDS_THUMBNAIL_PATH)