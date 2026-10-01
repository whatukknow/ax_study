// ========================================
// 1. Todo 데이터
// ========================================

// LocalStorage에 저장된 Todo 불러오기
let todos =
    JSON.parse(localStorage.getItem("todos")) || [];


// 현재 선택된 필터
// all / active / completed
let currentFilter = "all";


// 수정 중인 Todo의 ID
// null이면 새로운 Todo 등록 상태
let editingId = null;


// ========================================
// 2. DOM 요소 가져오기
// ========================================

const todoDate =
    document.querySelector("#todoDate");

const todoTitle =
    document.querySelector("#todoTitle");

const todoContent =
    document.querySelector("#todoContent");

const addButton =
    document.querySelector("#addButton");

const todoList =
    document.querySelector("#todoList");

const todoCount =
    document.querySelector("#todoCount");

const filterArea =
    document.querySelector(".filter-area");

const sortSelect =
    document.querySelector("#sortSelect");


// ========================================
// 3. LocalStorage 저장
// ========================================

function saveTodos() {

    localStorage.setItem(
        "todos",
        JSON.stringify(todos)
    );
}


// ========================================
// 4. 입력값 검사
// ========================================

function validateInput() {

    const date =
        todoDate.value;

    const title =
        todoTitle.value.trim();

    const content =
        todoContent.value.trim();


    // 날짜 확인
    if (date === "") {

        alert("날짜를 선택해주세요.");

        todoDate.focus();

        return false;
    }


    // 제목 확인
    if (title === "") {

        alert("제목을 입력해주세요.");

        todoTitle.focus();

        return false;
    }


    // 내용 확인
    if (content === "") {

        alert("내용을 입력해주세요.");

        todoContent.focus();

        return false;
    }


    return true;
}


// ========================================
// 5. Todo 등록 / 수정 완료
// ========================================

function saveTodo() {

    // 잘못된 입력이면 종료
    if (!validateInput()) {

        return;
    }


    const date =
        todoDate.value;

    const title =
        todoTitle.value.trim();

    const content =
        todoContent.value.trim();


    // ====================================
    // 수정 중인 경우
    // ====================================

    if (editingId !== null) {

        const todo =
            todos.find(function(todo) {

                return todo.id === editingId;
            });


        // 존재하지 않는 Todo
        if (!todo) {

            alert("수정할 할 일을 찾을 수 없습니다.");

            cancelEdit();

            return;
        }


        // 기존 데이터 변경
        todo.date = date;

        todo.title = title;

        todo.content = content;


        // LocalStorage 저장
        saveTodos();


        // 수정 상태 종료
        editingId = null;


        addButton.textContent =
            "등록하기";


        addButton.classList.remove(
            "editing"
        );


        // 입력창 초기화
        resetForm();


        // 화면 다시 그리기
        renderTodos();


        return;
    }


    // ====================================
    // 새로운 Todo 등록
    // ====================================

    const newTodo = {

        id: Date.now(),

        date: date,

        title: title,

        content: content,

        completed: false
    };


    // 배열에 추가
    todos.push(newTodo);


    // 저장
    saveTodos();


    // 입력창 초기화
    resetForm();


    // 화면 다시 그리기
    renderTodos();
}


// ========================================
// 6. 입력창 초기화
// ========================================

function resetForm() {

    todoDate.value = "";

    todoTitle.value = "";

    todoContent.value = "";
}


// ========================================
// 7. 수정 상태 취소
// ========================================

function cancelEdit() {

    editingId = null;


    addButton.textContent =
        "등록하기";


    addButton.classList.remove(
        "editing"
    );


    resetForm();
}


// ========================================
// 8. 현재 필터 적용
// ========================================

function getFilteredTodos() {

    return todos.filter(function(todo) {


        // 진행중
        if (currentFilter === "active") {

            return todo.completed === false;
        }


        // 완료
        if (currentFilter === "completed") {

            return todo.completed === true;
        }


        // 전체
        return true;
    });
}


// ========================================
// 9. 날짜 정렬
// ========================================

function sortTodos(todoArray) {

    return todoArray.sort(function(a, b) {

        const dateA =
            new Date(a.date);

        const dateB =
            new Date(b.date);


        // 날짜 빠른순
        if (sortSelect.value === "asc") {

            return dateA - dateB;
        }


        // 날짜 늦은순
        return dateB - dateA;
    });
}


// ========================================
// 10. Todo 화면 렌더링
// ========================================

function renderTodos() {

    // 기존 화면 초기화
    todoList.innerHTML = "";


    // 현재 필터 적용
    const filteredTodos =
        getFilteredTodos();


    // 날짜 정렬
    const sortedTodos =
        sortTodos(filteredTodos);


    // ====================================
    // 목록이 없는 경우
    // ====================================

    if (sortedTodos.length === 0) {

        todoList.innerHTML = `
            <p class="empty-message">
                등록된 할 일이 없습니다.
            </p>
        `;


        updateCount();

        return;
    }


    // ====================================
    // Todo 화면 생성
    // ====================================

    sortedTodos.forEach(function(todo) {

        const todoItem =
            document.createElement("div");


        todoItem.classList.add(
            "todo-item"
        );


        // DOM에 Todo ID 저장
        todoItem.dataset.id =
            todo.id;


        // 완료된 Todo
        if (todo.completed === true) {

            todoItem.classList.add(
                "completed"
            );
        }


        // Todo HTML
        todoItem.innerHTML = `

            <div class="todo-top">

                <input
                    type="checkbox"
                    class="todo-checkbox"
                    ${todo.completed ? "checked" : ""}
                >

                <span class="todo-date">
                    [${escapeHTML(todo.date)}]
                </span>

                <span class="todo-title">
                    ${escapeHTML(todo.title)}
                </span>

            </div>


            <div class="todo-content">
                ${escapeHTML(todo.content)}
            </div>


            <div class="button-area">

                <button
                    type="button"
                    class="delete-button"
                >
                    삭제
                </button>


                <button
                    type="button"
                    class="edit-button"
                >
                    수정
                </button>

            </div>
        `;


        todoList.appendChild(
            todoItem
        );
    });


    // 남은 할 일 갱신
    updateCount();
}


// ========================================
// 11. 남은 할 일 개수
// ========================================

function updateCount() {

    const activeTodos =
        todos.filter(function(todo) {

            return todo.completed === false;
        });


    todoCount.textContent =
        `남은 할 일: ${activeTodos.length}개`;
}


// ========================================
// 12. 완료 상태 변경
// ========================================

function toggleTodo(id, checked) {

    // 해당 Todo 찾기
    const todo =
        todos.find(function(todo) {

            return todo.id === id;
        });


    if (!todo) {

        alert("해당 할 일을 찾을 수 없습니다.");

        return;
    }


    // 체크 상태 그대로 저장
    todo.completed =
        checked;


    // LocalStorage 저장
    saveTodos();


    // 화면 다시 그리기
    renderTodos();
}


// ========================================
// 13. Todo 수정 시작
// ========================================

function startEditTodo(id) {

    // 수정할 Todo 찾기
    const todo =
        todos.find(function(todo) {

            return todo.id === id;
        });


    if (!todo) {

        alert("수정할 할 일을 찾을 수 없습니다.");

        return;
    }


    // 기존 내용을 입력창에 넣기
    todoDate.value =
        todo.date;

    todoTitle.value =
        todo.title;

    todoContent.value =
        todo.content;


    // 수정할 Todo ID 기억
    editingId =
        id;


    // 버튼 변경
    addButton.textContent =
        "수정 완료";


    addButton.classList.add(
        "editing"
    );


    // 화면 상단으로 이동
    window.scrollTo({

        top: 0,

        behavior: "smooth"
    });


    todoTitle.focus();
}


// ========================================
// 14. Todo 삭제
// ========================================

function deleteTodo(id) {

    // Todo 존재 여부 확인
    const todo =
        todos.find(function(todo) {

            return todo.id === id;
        });


    if (!todo) {

        alert("삭제할 할 일을 찾을 수 없습니다.");

        return;
    }


    // 삭제 확인
    const result =
        confirm("정말 삭제하시겠습니까?");


    if (!result) {

        return;
    }


    // 삭제할 Todo를 제외
    todos =
        todos.filter(function(todo) {

            return todo.id !== id;
        });


    // 수정 중인 Todo를 삭제한 경우
    if (editingId === id) {

        cancelEdit();
    }


    // 저장
    saveTodos();


    // 다시 렌더링
    renderTodos();
}


// ========================================
// 15. HTML 특수문자 처리
// ========================================

function escapeHTML(text) {

    return String(text)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");
}


// ========================================
// 16. 등록 버튼 이벤트
// ========================================

addButton.addEventListener(
    "click",
    function() {

        saveTodo();
    }
);


// ========================================
// 17. Todo 수정 / 삭제 이벤트 위임
// ========================================

todoList.addEventListener(
    "click",
    function(event) {

        const todoItem =
            event.target.closest(
                ".todo-item"
            );


        if (!todoItem) {

            return;
        }


        const id =
            Number(
                todoItem.dataset.id
            );


        // ------------------------------
        // 삭제 버튼
        // ------------------------------

        if (
            event.target.classList.contains(
                "delete-button"
            )
        ) {

            deleteTodo(id);

            return;
        }


        // ------------------------------
        // 수정 버튼
        // ------------------------------

        if (
            event.target.classList.contains(
                "edit-button"
            )
        ) {

            startEditTodo(id);

            return;
        }
    }
);


// ========================================
// 18. 체크박스 이벤트 위임
// ========================================

todoList.addEventListener(
    "change",
    function(event) {

        // 체크박스인지 확인
        if (
            !event.target.classList.contains(
                "todo-checkbox"
            )
        ) {

            return;
        }


        const todoItem =
            event.target.closest(
                ".todo-item"
            );


        if (!todoItem) {

            return;
        }


        const id =
            Number(
                todoItem.dataset.id
            );


        // 현재 체크 상태
        const checked =
            event.target.checked;


        // 완료 상태 변경
        toggleTodo(
            id,
            checked
        );
    }
);


// ========================================
// 19. 필터 이벤트
// ========================================

filterArea.addEventListener(
    "click",
    function(event) {

        // 필터 버튼인지 확인
        if (
            !event.target.classList.contains(
                "filter-button"
            )
        ) {

            return;
        }


        // 선택한 필터 저장
        currentFilter =
            event.target.dataset.filter;


        // 모든 필터 버튼 가져오기
        const filterButtons =
            document.querySelectorAll(
                ".filter-button"
            );


        // 기존 active 제거
        filterButtons.forEach(
            function(button) {

                button.classList.remove(
                    "active"
                );
            }
        );


        // 현재 버튼 active 추가
        event.target.classList.add(
            "active"
        );


        // 화면 다시 그리기
        renderTodos();
    }
);


// ========================================
// 20. 날짜 정렬 이벤트
// ========================================

sortSelect.addEventListener(
    "change",
    function() {

        renderTodos();
    }
);


// ========================================
// 21. 최초 실행
// ========================================

renderTodos();