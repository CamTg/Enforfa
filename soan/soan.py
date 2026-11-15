"""Tạo lại các tệp bài của một tuần từ nguồn soạn.

    python soan/soan.py w2

Sau đó tạo âm thanh bằng tools/build_audio.py và kiểm bằng tools/check_audio.py.
"""
import pathlib, runpy, sys

here = pathlib.Path(__file__).resolve().parent
weeks = sys.argv[1:] or sorted(p.name for p in here.iterdir() if p.is_dir() and p.name.startswith("w"))
for week in weeks:
    for f in sorted((here / week).glob("l*.py")):
        runpy.run_path(str(f), run_name="__main__")
