// ========================================
// 일정 관리 Todo - todo.js
//
// [핵심 구조]
// 1) 데이터(todos 배열)가 "유일한 원본(single source of truth)"
// 2) 추가/수정/삭제/완료 → 항상 todos 배열만 바꾼다
// 3) 바꾼 뒤에는 render()를 호출해서 배열 내용대로 화면을 "처음부터 다시" 그린다
//    → 화면과 데이터가 어긋날 일이 없음
// ========================================


// ========================================
// 1. 데이터 (상태 변수)
// ========================================

// localStorage에 저장할 때 쓰는 이름(키)
const STORAGE_KEY = "todo-js-assignment";

// 일정 목록 배열
// 각 일정은 객체: { id, title, date, completed, createdAt }
// 저장된 값이 있으면 JSON 문자열 → 배열로 바꿔서 불러오고, 없으면(null) 빈 배열
let todos = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// 현재 선택된 필터: "all"(전체) / "active"(진행중) / "completed"(완료)
let currentFilter = "all";

// 현재 검색어 (빈 문자열이면 검색하지 않음)
let searchKeyword = "";

// 지금 수정 중인 일정의 id (null이면 수정 중인 일정 없음)
let editingId = null;


// ========================================
// 2. DOM 요소 가져오기
// ========================================

const todoForm = document.getElementById("todoForm");
const titleInput = document.getElementById("todoTitle");
const dateInput = document.getElementById("todoDate");
const errorMessage = document.getElementById("errorMessage");
const todoList = document.getElementById("todoList");
const todoCount = document.getElementById("todoCount");
const filterArea = document.getElementById("filterArea");
const searchInput = document.getElementById("searchInput");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");


// ========================================
// 3. localStorage 저장
// ========================================

function saveTodos() {
    // 배열은 그대로 저장할 수 없으므로 JSON 문자열로 바꿔서 저장
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}


// ========================================
// 4. 입력값 검사
//    통과하면 true, 문제가 있으면 오류 문구를 보여 주고 false
// ========================================

function validate(title, date) {
    // trim(): 앞뒤 공백 제거 → 스페이스만 입력한 경우도 빈 값으로 처리
    if (title.trim() === "") {
        errorMessage.textContent = "할 일을 입력해 주세요.";
        return false;
    }

    if (date === "") {
        errorMessage.textContent = "날짜를 선택해 주세요.";
        return false;
    }

    // 문제가 없으면 이전 오류 문구를 지움
    errorMessage.textContent = "";
    return true;
}


// ========================================
// 5. id로 일정 하나 찾기
// ========================================

function findTodo(id) {
    // find(): 조건이 처음으로 true가 되는 요소 1개를 돌려줌 (없으면 undefined)
    return todos.find(function (todo) {
        return todo.id === id;
    });
}


// ========================================
// 6. 일정 추가 (Create)
// ========================================

function addTodo(title, date) {
    // Date.now(): 1970년부터 지금까지의 밀리초 → 숫자 id로 사용
    let newId = Date.now();

    // 아주 빠르게 연속 추가하면 같은 밀리초가 나올 수 있으므로
    // 이미 있는 id라면 1씩 늘려서 겹치지 않게 함
    while (findTodo(newId)) {
        newId = newId + 1;
    }

    // 새 일정 객체 만들기
    const newTodo = {
        id: newId,
        title: title.trim(),
        date: date,
        completed: false,
        // 만든 시각 (문자열로 저장)
        createdAt: new Date().toISOString()
    };

    // 배열 맨 뒤에 추가
    todos.push(newTodo);

    saveTodos();
    render();
}


// ========================================
// 7. 완료 상태 토글 (Update)
// ========================================

function toggleTodo(id) {
    const todo = findTodo(id);

    // 혹시 일정이 없으면 아무것도 하지 않음
    if (!todo) {
        return;
    }

    // true ↔ false 뒤집기
    todo.completed = !todo.completed;

    saveTodos();
    render();
}


// ========================================
// 8. 수정 (Update)
//    "수정" 버튼 → 수정 모드 시작 (그 줄이 입력칸으로 바뀜)
//    "저장" 버튼 → 입력값을 검사하고 데이터에 반영
//    "취소" 버튼 → 수정 모드 종료
// ========================================

function startEdit(id) {
    // 수정 중인 일정 id를 기억 → render()가 이 줄만 입력칸으로 그림
    editingId = id;
    render();
}

function saveEdit(id, li) {
    // 수정 모드 줄 안의 입력칸 2개 찾기
    const newTitle = li.querySelector(".edit-title").value;
    const newDate = li.querySelector(".edit-date").value;

    // 빈 값이면 저장하지 않음
    if (!validate(newTitle, newDate)) {
        return;
    }

    const todo = findTodo(id);

    if (todo) {
        todo.title = newTitle.trim();
        todo.date = newDate;
    }

    // 수정 모드 종료
    editingId = null;

    saveTodos();
    render();
}

function cancelEdit() {
    editingId = null;
    errorMessage.textContent = "";
    render();
}


// ========================================
// 9. 삭제 (Delete)
// ========================================

function deleteTodo(id) {
    // confirm(): 확인=true, 취소=false
    if (!confirm("이 일정을 삭제할까요?")) {
        return;
    }

    // filter(): id가 다른 일정만 남김 → 결과적으로 해당 일정이 빠진 새 배열
    todos = todos.filter(function (todo) {
        return todo.id !== id;
    });

    // 수정 중이던 일정을 지웠다면 수정 모드도 해제
    if (editingId === id) {
        editingId = null;
    }

    saveTodos();
    render();
}

// 완료된 일정 한 번에 삭제
function clearCompleted() {
    // some(): 하나라도 조건을 만족하면 true
    const hasCompleted = todos.some(function (todo) {
        return todo.completed;
    });

    if (!hasCompleted) {
        alert("완료된 일정이 없습니다.");
        return;
    }

    if (!confirm("완료된 일정을 모두 삭제할까요?")) {
        return;
    }

    // 완료되지 않은 일정만 남김
    todos = todos.filter(function (todo) {
        return !todo.completed;
    });

    saveTodos();
    render();
}


// ========================================
// 10. 조회 (Read) - 필터 + 검색 적용
// ========================================

function getVisibleTodos() {
    return todos
        // ① 상태 필터
        .filter(function (todo) {
            if (currentFilter === "active") {
                return !todo.completed;
            }
            if (currentFilter === "completed") {
                return todo.completed;
            }
            // "all"이면 모두 통과
            return true;
        })
        // ② 검색어 필터: 제목에 검색어가 들어 있는 일정만
        .filter(function (todo) {
            // includes(): 문자열 안에 해당 글자가 있으면 true
            // toLowerCase(): 영어 대소문자 구분 없이 검색하기 위해 소문자로 통일
            return todo.title.toLowerCase().includes(searchKeyword.toLowerCase());
        });
}


// ========================================
// 11. 개수 표시 - reduce 사용
// ========================================

function updateCount() {
    // reduce(): 배열을 돌면서 값을 하나로 누적
    // 완료된 일정이면 +1, 아니면 +0 → 완료 개수
    const completedCount = todos.reduce(function (count, todo) {
        return todo.completed ? count + 1 : count;
    }, 0);

    const totalCount = todos.length;
    const activeCount = totalCount - completedCount;

    // 템플릿 리터럴(`${}`)로 문장 만들기
    todoCount.textContent =
        `전체 ${totalCount}개 · 남은 일 ${activeCount}개 · 완료 ${completedCount}개`;
}


// ========================================
// 12. 버튼 만들기 도우미 함수
//     같은 모양의 버튼을 여러 번 만들기 때문에 함수로 분리
// ========================================

function createButton(text, action) {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = text;

    // 공통 클래스 + 종류별 클래스 (예: item-btn edit-btn) → CSS 색 구분용
    button.classList.add("item-btn", action + "-btn");

    // data-action="edit" 처럼 저장 → 이벤트 위임에서 어떤 버튼인지 구분
    button.dataset.action = action;

    return button;
}


// ========================================
// 13. 일정 한 줄(li) 만들기
// ========================================

// 보통 모드: [체크박스] 제목/날짜 [수정][삭제]
function createTodoItem(todo) {
    const li = document.createElement("li");
    li.classList.add("todo-item");

    // data-id에 일정 id 저장 → 클릭 시 어떤 일정인지 알아낼 수 있음
    li.dataset.id = todo.id;

    // 완료된 일정이면 completed 클래스 추가 (CSS에서 취소선)
    if (todo.completed) {
        li.classList.add("completed");
    }

    // 체크박스
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.classList.add("todo-check");
    checkbox.checked = todo.completed;
    checkbox.dataset.action = "toggle";

    // 체크박스에 화면 낭독기용 이름 붙이기 (접근성)
    checkbox.title = "완료 표시";

    // 제목 + 날짜를 담는 영역
    const content = document.createElement("div");
    content.classList.add("todo-content");

    const title = document.createElement("span");
    title.classList.add("todo-title");
    // textContent: 글자로만 넣음 → 사용자가 <태그>를 입력해도 HTML로 실행되지 않아 안전
    title.textContent = todo.title;

    const date = document.createElement("span");
    date.classList.add("todo-date");
    date.textContent = todo.date;

    content.append(title, date);

    // 버튼 영역
    const buttons = document.createElement("div");
    buttons.classList.add("item-buttons");
    buttons.append(createButton("수정", "edit"), createButton("삭제", "delete"));

    // li 안에 순서대로 넣기
    li.append(checkbox, content, buttons);

    return li;
}

// 수정 모드: [제목 입력칸][날짜 입력칸] [저장][취소]
function createEditItem(todo) {
    const li = document.createElement("li");
    li.classList.add("todo-item");
    li.dataset.id = todo.id;

    const content = document.createElement("div");
    content.classList.add("todo-content");

    // 제목 입력칸 (기존 값으로 채움)
    const titleField = document.createElement("input");
    titleField.type = "text";
    titleField.classList.add("edit-input", "edit-title");
    titleField.value = todo.title;
    titleField.maxLength = 50;
    // 라벨 대신 title 속성으로 입력칸 이름 제공 (접근성)
    titleField.title = "할 일 수정";

    // 날짜 입력칸
    const dateField = document.createElement("input");
    dateField.type = "date";
    dateField.classList.add("edit-input", "edit-date");
    dateField.value = todo.date;
    dateField.title = "날짜 수정";

    content.append(titleField, dateField);

    const buttons = document.createElement("div");
    buttons.classList.add("item-buttons");
    buttons.append(createButton("저장", "save"), createButton("취소", "cancel"));

    li.append(content, buttons);

    return li;
}


// ========================================
// 14. 화면 그리기 (render)
//     todos 배열 → 화면. 데이터가 바뀔 때마다 호출
// ========================================

function render() {
    // 기존 목록을 모두 비우고 새로 그림
    todoList.textContent = "";

    const visibleTodos = getVisibleTodos();

    // 보여 줄 일정이 없으면 안내 문구
    if (visibleTodos.length === 0) {
        const empty = document.createElement("li");
        empty.classList.add("empty-message");
        empty.textContent = todos.length === 0
            ? "등록된 일정이 없습니다. 위에서 추가해 보세요!"
            : "조건에 맞는 일정이 없습니다.";
        todoList.append(empty);
    } else {
        // map(): 일정 객체 배열 → li 요소 배열로 변환
        // 수정 중인 일정은 수정 모드 모양으로 만듦
        const items = visibleTodos.map(function (todo) {
            if (todo.id === editingId) {
                return createEditItem(todo);
            }
            return createTodoItem(todo);
        });

        // 전개 연산자(...)로 배열의 li들을 한 번에 append
        todoList.append(...items);
    }

    updateCount();

    // 수정 모드라면 제목 입력칸에 바로 커서를 둠
    const editTitle = todoList.querySelector(".edit-title");
    if (editTitle) {
        editTitle.focus();
    }
}


// ========================================
// 15. 이벤트 - 일정 추가 폼 제출
// ========================================

todoForm.addEventListener("submit", function (e) {
    // form 제출 시 페이지가 새로고침되는 기본 동작 막기
    e.preventDefault();

    const title = titleInput.value;
    const date = dateInput.value;

    if (!validate(title, date)) {
        return;
    }

    addTodo(title, date);

    // 입력칸 비우고 다시 제목 칸에 커서
    titleInput.value = "";
    titleInput.focus();
});


// ========================================
// 16. 이벤트 위임 - 목록(ul) 하나에만 클릭 리스너
//
//   li마다 버튼마다 리스너를 붙이지 않고, 부모 ul 하나에만 붙임
//   → 클릭 이벤트가 버블링(자식 → 부모로 전파)되어 ul까지 올라오는 성질 이용
//   → render()로 li를 새로 만들어도 리스너를 다시 붙일 필요가 없음 (성능·코드 단순화)
// ========================================

todoList.addEventListener("click", function (e) {
    // closest(): 클릭된 요소부터 위로 올라가며 data-action 속성을 가진 가장 가까운 요소 찾기
    const target = e.target.closest("[data-action]");

    // 버튼/체크박스가 아닌 곳(빈 공간 등)을 클릭했으면 무시
    if (!target) {
        return;
    }

    // 그 버튼이 속한 li 찾기 → data-id에서 일정 id 꺼내기
    const li = target.closest(".todo-item");
    // dataset 값은 항상 문자열이므로 숫자로 변환 (id가 숫자이기 때문)
    const id = Number(li.dataset.id);

    // data-action 값에 따라 해당 기능 실행
    const action = target.dataset.action;

    if (action === "toggle") {
        toggleTodo(id);
    } else if (action === "edit") {
        startEdit(id);
    } else if (action === "delete") {
        deleteTodo(id);
    } else if (action === "save") {
        saveEdit(id, li);
    } else if (action === "cancel") {
        cancelEdit();
    }
});

// 수정 모드에서 키보드 사용: Enter = 저장, Escape = 취소
todoList.addEventListener("keydown", function (e) {
    // 수정 입력칸에서 누른 키만 처리
    if (!e.target.classList.contains("edit-input")) {
        return;
    }

    const li = e.target.closest(".todo-item");
    const id = Number(li.dataset.id);

    if (e.key === "Enter") {
        saveEdit(id, li);
    } else if (e.key === "Escape") {
        cancelEdit();
    }
});


// ========================================
// 17. 이벤트 - 필터 버튼 (이것도 부모 하나에 위임)
// ========================================

filterArea.addEventListener("click", function (e) {
    const button = e.target.closest(".filter-btn");

    if (!button) {
        return;
    }

    // data-filter 값(all/active/completed)을 현재 필터로 저장
    currentFilter = button.dataset.filter;

    // 모든 필터 버튼에서 active를 빼고, 누른 버튼에만 active
    filterArea.querySelectorAll(".filter-btn").forEach(function (btn) {
        btn.classList.remove("active");
    });
    button.classList.add("active");

    render();
});


// ========================================
// 18. 이벤트 - 검색 (글자를 입력할 때마다)
// ========================================

searchInput.addEventListener("input", function () {
    searchKeyword = searchInput.value.trim();
    render();
});


// ========================================
// 19. 이벤트 - 완료된 일정 모두 삭제
// ========================================

clearCompletedBtn.addEventListener("click", function () {
    clearCompleted();
});


// ========================================
// 20. 최초 실행
// ========================================

// 날짜 입력칸 기본값 = 오늘 (date 입력칸은 "YYYY-MM-DD" 형식 문자열을 받음)
const today = new Date();
const year = today.getFullYear();
// getMonth()는 0~11이므로 +1, padStart(2, "0")로 "5" → "05"처럼 두 자리로 맞춤
const month = String(today.getMonth() + 1).padStart(2, "0");
const day = String(today.getDate()).padStart(2, "0");
dateInput.value = `${year}-${month}-${day}`;

// 저장된 데이터로 첫 화면 그리기
render();
