class Book:
    def __init__(self, title, author, isbn):
        self.__title = title
        self.__author = author
        self.__isbn = isbn
        self.__is_rented = False

    def get_title(self):
        return self.__title

    def get_author(self):
        return self.__author

    def get_isbn(self):
        return self.__isbn

    def get_is_rented(self):
        return self.__is_rented

    def rent(self):
        if self.__is_rented:
            return False

        self.__is_rented = True
        return True

    def return_book(self):
        if not self.__is_rented:
            return False

        self.__is_rented = False
        return True

    def get_details(self):
        status = "대여중" if self.__is_rented else "대여 가능"

        return (
            f"도서명: {self.__title} | "
            f"저자: {self.__author} | "
            f"ISBN: {self.__isbn} | "
            f"상태: {status}"
        )