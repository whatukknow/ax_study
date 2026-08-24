from models.base_book import Book


class PaperBook(Book):
    def __init__(self, title, author, isbn, pages):
        super().__init__(title, author, isbn)
        self.__pages = pages

    def get_details(self):
        return (
            f"[일반 단행본] "
            f"{super().get_details()} | "
            f"페이지: {self.__pages}"
        )


class EBook(Book):
    def __init__(self, title, author, isbn, file_size):
        super().__init__(title, author, isbn)
        self.__file_size = file_size

    def get_details(self):
        return (
            f"[전자 도서] "
            f"{super().get_details()} | "
            f"파일 크기: {self.__file_size}MB"
        )