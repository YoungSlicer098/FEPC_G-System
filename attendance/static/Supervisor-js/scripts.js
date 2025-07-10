document.addEventListener("DOMContentLoaded", function () {
    const addCourseBtn = document.getElementById("addCourseBtn");
    const closeModal = document.getElementById("closeModal");
    const courseForm = document.getElementById("courseForm");
    const courseList = document.getElementById("courseList");
    const manageCoursesBtn = document.getElementById("manageCoursesBtn");
    const deleteCourseModal = document.getElementById("deleteCourseModal");
    const deleteCourseMessage = document.getElementById("deleteCourseMessage");
    const cancelDeleteCourseBtn = document.getElementById("cancelDeleteCourse");
    const confirmDeleteCourseBtn = document.getElementById("confirmDeleteCourse");
    const editCourseModal = document.getElementById("editCourseModal");
    const closeEditModal = document.getElementById("closeEditModal");
    const editCourseForm = document.getElementById("editCourseForm");
    const editCourseNameInput = document.getElementById("editCourseName");
    const editAcademicYearSelect = document.getElementById("editAcademicYear");
    const academicYearSelect = document.getElementById("academicYear");

    let isManaging = false;
    let courseToDelete = null;
    let courseToEdit = null;

    const currentYear = new Date().getFullYear();
    const numberOfYears = 5;

    function getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }

    function populateAcademicYearDropdown(selectElement) {
        for (let i = 0; i < numberOfYears; i++) {
            const startYear = currentYear + i;
            const endYear = startYear + 1;
            const option = document.createElement("option");
            option.value = `${startYear}-${endYear}`;
            option.textContent = `${startYear}-${endYear}`;
            selectElement.appendChild(option);
        }
    }

    populateAcademicYearDropdown(academicYearSelect);
    populateAcademicYearDropdown(editAcademicYearSelect);

    const closeModalById = (id) => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add("hidden");
        } else {
            console.warn(`Modal with id "${id}" not found.`);
        }
    };

    const openModalById = (id) => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove("hidden");
        } else {
            console.warn(`Modal with id "${id}" not found.`);
        }
    };

    addCourseBtn.addEventListener("click", () => openModalById("addCourseModal"));
    closeModal.addEventListener("click", () => closeModalById("addCourseModal"));

    courseForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const courseName = document.getElementById("courseName").value.trim();
        const academicYear = academicYearSelect.value.trim();

        if (!courseName || !academicYear) {
            alert("Please fill in both the Course Name and Academic Year.");
            return;
        }

        const createCourseUrl = document.getElementById("courseFormWrapper").dataset.createUrl;
        fetch(createCourseUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCSRFToken()
            },
            body: JSON.stringify({
                name: courseName,
                academic_year: academicYear
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                const courseItem = document.createElement("div");
                courseItem.className = "bg-white p-4 rounded-lg shadow-md flex justify-between items-center courseItem";
                courseItem.setAttribute("data-course-id", data.course.id);
                courseItem.setAttribute("data-course-name", courseName);
                courseItem.innerHTML = `
                    <p class="text-lg font-semibold">
                        ${courseName}
                        <span class="text-gray-500 text-sm">${academicYear}</span>
                    </p>
                    <div class="flex space-x-2">
                        <button class="editCourse ${isManaging ? '' : 'hidden'} bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">✏️</button>
                        <button class="deleteCourse ${isManaging ? '' : 'hidden'} bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">🗑️</button>
                        <button class="viewStudentsBtn bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700">View Students</button>
                    </div>
                `;

                courseList.appendChild(courseItem);
                bindCourseActionButtons(); // Bind buttons for the new item
                updateTotalCoursesCount();
                courseForm.reset();
                closeModalById("addCourseModal");

                const noCoursesMessage = document.getElementById("noCoursesMessage");
                if (noCoursesMessage) {
                    noCoursesMessage.remove();
                }

                setTimeout(() => {
                    location.reload();  // <-- put this at the end of the success block
                }, 300); // optional slight delay to allow UI changes first

            } else {
                alert("Failed to create course. Please try again.");
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("There was an error creating the course.");
        });
    });

    closeEditModal.addEventListener("click", () => {
        closeModalById("editCourseModal");
        courseToEdit = null;
    });

    editCourseForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const updatedCourseName = editCourseNameInput.value.trim();
        const updatedAcademicYear = editAcademicYearSelect.value.trim();

        if (!updatedCourseName || !updatedAcademicYear) {
            alert("Please fill in both the Course Name and Academic Year.");
            return;
        }

        if (courseToEdit) {
            const courseId = courseToEdit.getAttribute("data-course-id");

            fetch(`/update-course/${courseId}/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken(),
                },
                body: JSON.stringify({
                    name: updatedCourseName,
                    academic_year: updatedAcademicYear,
                }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === "success") {
                    courseToEdit.querySelector("p").innerHTML = `
                        ${updatedCourseName}
                        <span class="text-gray-500 text-sm">${updatedAcademicYear}</span>
                    `;
                    courseToEdit.setAttribute("data-course-name", updatedCourseName);
                    closeModalById("editCourseModal");
                    courseToEdit = null;
                } else {
                    alert("Failed to update course: " + data.message);
                }
            })
            .catch(error => {
                console.error("Error updating course:", error);
            });
        }
    });

    cancelDeleteCourseBtn.addEventListener("click", () => {
        closeModalById("deleteCourseModal");
        courseToDelete = null;
    });

    confirmDeleteCourseBtn.addEventListener("click", () => {
        if (!courseToDelete) {
            alert("No course selected for deletion.");
            return;
        }

        const courseId = courseToDelete.getAttribute("data-course-id");

        fetch("/supervisor/delete-course/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCSRFToken()
            },
            body: JSON.stringify({ course_id: courseId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                courseToDelete.remove();
                updateTotalCoursesCount();
                courseToDelete = null;
                closeModalById("deleteCourseModal");

                if (courseList.children.length === 0) {
                    const message = document.createElement("p");
                    message.id = "noCoursesMessage";
                    message.className = "text-gray-600";
                    message.textContent = 'No courses yet. Click "Add Course" to create one.';
                    courseList.appendChild(message);
                }
            } else {
                alert("Failed to delete course: " + data.message);
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("There was an error deleting the course.");
        });
    });

    manageCoursesBtn.addEventListener("click", () => {
        isManaging = !isManaging;
        document.querySelectorAll(".editCourse, .deleteCourse").forEach(btn => {
            btn.classList.toggle("hidden", !isManaging);
        });
    });

    function bindCourseActionButtons() {
        const deleteButtons = document.querySelectorAll(".deleteCourse");
        const editButtons = document.querySelectorAll(".editCourse");
        const viewButtons = document.querySelectorAll(".viewStudentsBtn");

        console.log("📌 Binding delete buttons:", deleteButtons.length);
        console.log("📌 Binding edit buttons:", editButtons.length);
        console.log("📌 Binding view buttons:", viewButtons.length);

        deleteButtons.forEach(button => {
            button.onclick = () => {
                const courseItem = button.closest(".courseItem");
                if (!courseItem) {
                    console.warn("⚠️ Could not find courseItem for delete button.");
                    return;
                }

                const courseName = courseItem.getAttribute("data-course-name");
                courseToDelete = courseItem;

                console.log("🗑️ Course selected for deletion:", courseName);
                deleteCourseMessage.innerHTML =
                    `Are you sure you want to delete the strand: <strong>${courseName}</strong>?`;
                openModalById("deleteCourseModal");
            };
        });

        editButtons.forEach(button => {
            button.onclick = () => {
                const courseItem = button.closest(".courseItem");
                if (!courseItem) {
                    console.warn("⚠️ Could not find courseItem for edit button.");
                    return;
                }

                courseToEdit = courseItem;
                const name = courseToEdit.getAttribute("data-course-name");
                const year = courseToEdit.querySelector("span.text-gray-500.text-sm")?.textContent.trim();

                console.log("✏️ Editing course:", name, year);

                editCourseNameInput.value = name;
                editAcademicYearSelect.value = year;
                openModalById("editCourseModal");
            };
        });

        viewButtons.forEach(button => {
            button.onclick = () => {
                const courseItem = button.closest(".courseItem");
                if (!courseItem) {
                    console.warn("⚠️ Could not find courseItem for view button.");
                    return;
                }

                const courseName = courseItem.getAttribute("data-course-name");
                if (courseName) {
                    const courseParam = encodeURIComponent(courseName);
                    console.log("👁️ Viewing students for course:", courseName);
                    window.location.href = `/supervisor/view-students/${courseParam}/`;
                }
            };
        });
    }

    function updateTotalCoursesCount() {
        const courses = document.querySelectorAll('.courseItem');
        const totalCountElement = document.getElementById('totalCoursesCount');
        if (totalCountElement) {
            totalCountElement.textContent = courses.length;
        }
    }

    // Run on page load
    updateTotalCoursesCount();
    bindCourseActionButtons();  // Bind buttons on existing server-rendered items
});
