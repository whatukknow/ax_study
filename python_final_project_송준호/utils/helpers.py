def validate_not_empty(value, field_name):
    if not value.strip():
        print(f"{field_name}은(는) 비워둘 수 없습니다.")
        return False

    return True


def validate_isbn(isbn):
    if not isbn.strip():
        print("ISBN은 비워둘 수 없습니다.")
        return False

    return True


def input_positive_int(message):
    try:
        value = int(input(message))

        if value <= 0:
            print("0보다 큰 숫자를 입력해주세요.")
            return None

        return value

    except ValueError:
        print("정수를 입력해주세요.")
        return None


def input_positive_float(message):
    try:
        value = float(input(message))

        if value <= 0:
            print("0보다 큰 숫자를 입력해주세요.")
            return None

        return value

    except ValueError:
        print("숫자를 입력해주세요.")
        return None