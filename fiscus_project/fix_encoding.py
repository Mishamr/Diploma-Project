import os
import glob

FRONTEND_SRC_DIR = r"d:\Projects\Diploma-Project\fiscus_project\frontend\src"

def fix_file_encoding(filepath):
    try:
        # Read the file as utf-8 (which it currently is, but contains cp1251 bytes interpreted as utf-8 chars)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Try to encode it back to cp1251 bytes, then decode as utf-8
        try:
            fixed_content = content.encode('cp1251').decode('utf-8')
        except UnicodeError:
            # If it fails, it might already be correct or have some irreversible damage. We skip.
            return False

        if content != fixed_content:
            # Write back the fixed content
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            print(f"Fixed: {filepath}")
            return True
            
        return False
        
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    print(f"Scanning directory: {FRONTEND_SRC_DIR} for .js files...")
    files = glob.glob(os.path.join(FRONTEND_SRC_DIR, "**", "*.js"), recursive=True)
    fixed_count = 0
    total_count = len(files)
    
    for filepath in files:
        if fix_file_encoding(filepath):
            fixed_count += 1
            
    print(f"\nScan complete. Fixed {fixed_count} out of {total_count} files.")

if __name__ == "__main__":
    main()
