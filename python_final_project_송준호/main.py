from datetime import datetime
from collections import Counter

from models.specialized_books import PaperBook, EBook
from utils.helpers import (
    validate_not_empty,
    validate_isbn,
    input_positive_int,
    input_positive_float,
)


# ISBN으로 빠르게 도서를 조회하기 위해 Dictionary 사용
books = {}

# ISBN은 고유값이므로 중복 방지를 위해 Set 사용
isbn_set = set()

# 대여/반납 이력을 발생 순서대로 저장하기 위해 List 사용
history = []


def add_book():
    print("\n===== 도서 등록 =====")
    print("1. 일반 단행본")
    print("2. 전자 도서")

    book_type = input("도서 유형을 선택하세요: ").strip()

    title = input("도서명: ").strip()
    author = input("저자: ").strip()
    isbn = input("ISBN: ").strip()

    if not validate_not_empty(title, "도서명"):
        return

    if not validate_not_empty(author, "저자"):
        return

    if not validate_isbn(isbn):
        return

    if isbn in isbn_set:
        print("이미 등록된 ISBN입니다.")
        return

    if book_type == "1":
        pages = input_positive_int("페이지 수: ")

        if pages is None:
            return

        book = PaperBook(title, author, isbn, pages)

    elif book_type == "2":
        file_size = input_positive_float("파일 크기(MB): ")

        if file_size is None:
            return

        book = EBook(title, author, isbn, file_size)

    else:
        print("잘못된 도서 유형입니다.")
        return

    books[isbn] = book
    isbn_set.add(isbn)

    print("도서가 정상적으로 등록되었습니다.")


def show_all_books():
    if not books:
        print("등록된 도서가 없습니다.")
        return

    print("\n===== 전체 도서 조회 =====")

    for book in books.values():
        print(book.get_details())


def search_book():
    isbn = input("검색할 ISBN을 입력하세요: ").strip()

    if not validate_isbn(isbn):
        return

    book = books.get(isbn)

    if book is None:
        print("해당 ISBN의 도서를 찾을 수 없습니다.")
        return

    print(book.get_details())


def rent_book():
    isbn = input("대여할 도서의 ISBN: ").strip()

    book = books.get(isbn)

    if book is None:
        print("존재하지 않는 도서입니다.")
        return

    if book.rent():
        # 한 건의 이력은 변경하지 않도록 Tuple로 저장
        record = (
            isbn,
            book.get_title(),
            "대여",
            datetime.now(),
        )

        history.append(record)

        print(f"'{book.get_title()}' 도서가 대여되었습니다.")

    else:
        print("이미 대여 중인 도서입니다.")


def return_book():
    isbn = input("반납할 도서의 ISBN: ").strip()

    book = books.get(isbn)

    if book is None:
        print("존재하지 않는 도서입니다.")
        return

    if book.return_book():
        record = (
            isbn,
            book.get_title(),
            "반납",
            datetime.now(),
        )

        history.append(record)

        print(f"'{book.get_title()}' 도서가 반납되었습니다.")

    else:
        print("현재 대여 중인 도서가 아닙니다.")


def rental_menu():
    print("\n===== 대여 / 반납 처리 =====")
    print("1. 도서 대여")
    print("2. 도서 반납")

    choice = input("선택: ").strip()

    if choice == "1":
        rent_book()

    elif choice == "2":
        return_book()

    else:
        print("잘못된 메뉴입니다.")


def show_statistics():
    rent_records = [
        record
        for record in history
        if record[2] == "대여"
    ]

    if not rent_records:
        print("대여 기록이 없습니다.")
        return

    print("\n===== 대여 통계 =====")
    print(f"총 대여 횟수: {len(rent_records)}회")

    title_counter = Counter(
        record[1]
        for record in rent_records
    )

    print("\n[가장 많이 대여된 도서]")

    for title, count in title_counter.most_common():
        print(f"{title}: {count}회")

    monthly_counter = Counter(
        record[3].strftime("%Y-%m")
        for record in rent_records
    )

    print("\n[월간 대여 통계]")

    for month, count in sorted(monthly_counter.items()):
        print(f"{month}: {count}회")


def main():
    while True:
        print("\n============================")
        print("       도서 관리 시스템")
        print("============================")
        print("1. 도서 등록")
        print("2. 전체 도서 조회")
        print("3. 도서 검색")
        print("4. 대여 / 반납 처리")
        print("5. 통계 조회")
        print("6. 종료")

        try:
            choice = int(input("메뉴를 선택하세요: "))

        except ValueError:
            print("숫자를 입력해주세요.")
            continue

        if choice == 1:
            add_book()

        elif choice == 2:
            show_all_books()

        elif choice == 3:
            search_book()

        elif choice == 4:
            rental_menu()

        elif choice == 5:
            show_statistics()

        elif choice == 6:
            print("프로그램을 종료합니다.")
            break

        else:
            print("1~6 사이의 숫자를 입력해주세요.")


if __name__ == "__main__":
    main()