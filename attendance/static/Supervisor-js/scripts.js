document.addEventListener("DOMContentLoaded", function () {
    // Modal elements
    const addCourseBtn = document.getElementById("addCourseBtn");
    const closeModal = document.getElementById("closeModal");
    const courseForm = document.getElementById("courseForm");
    const courseList = document.getElementById("courseList");
    const manageCoursesBtn = document.getElementById("manageCoursesBtn");
    const manageAcademicYearsBtn = document.getElementById("manageAcademicYearsBtn");
    const manageSemestersBtn = document.getElementById("manageSemestersBtn");
    
    // Course modals
    const deleteCourseModal = document.getElementById("deleteCourseModal");
    const deleteCourseMessage = document.getElementById("deleteCourseMessage");
    const cancelDeleteCourseBtn = document.getElementById("cancelDeleteCourse");
    const confirmDeleteCourseBtn = document.getElementById("confirmDeleteCourse");
    const editCourseModal = document.getElementById("editCourseModal");
    const closeEditModal = document.getElementById("closeEditModal");
    const editCourseForm = document.getElementById("editCourseForm");
    
    // Course form elements
    const courseNameInput = document.getElementById("courseName");
    const courseCodeInput = document.getElementById("courseCode");
    const academicYearSelect = document.getElementById("academicYear");
    const semesterSelect = document.getElementById("semester");
    const newSubjectNameInput = document.getElementById("newSubjectName");
    const newSubjectCodeInput = document.getElementById("newSubjectCode");
    const addSubjectBtn = document.getElementById("addSubjectBtn");
    const subjectsList = document.getElementById("subjectsList");
    
    // Edit course form elements
    const editCourseNameInput = document.getElementById("editCourseName");
    const editCourseCodeInput = document.getElementById("editCourseCode");
    const editAcademicYearSelect = document.getElementById("editAcademicYear");
    const editSemesterSelect = document.getElementById("editSemester");
    const editNewSubjectNameInput = document.getElementById("editNewSubjectName");
    const editNewSubjectCodeInput = document.getElementById("editNewSubjectCode");
    const editAddSubjectBtn = document.getElementById("editAddSubjectBtn");
    const editSubjectsList = document.getElementById("editSubjectsList");
    
    // Management modals
    const academicYearModal = document.getElementById("academicYearModal");
    const closeAcademicYearModal = document.getElementById("closeAcademicYearModal");
    const newAcademicYearInput = document.getElementById("newAcademicYear");
    const addAcademicYearBtn = document.getElementById("addAcademicYearBtn");
    const academicYearsList = document.getElementById("academicYearsList");
    
    const semesterModal = document.getElementById("semesterModal");
    const closeSemesterModal = document.getElementById("closeSemesterModal");
    const newSemesterSelect = document.getElementById("newSemester");
    const addSemesterBtn = document.getElementById("addSemesterBtn");
    const semestersList = document.getElementById("semestersList");
    
    // Warning modal
    const deleteWarningModal = document.getElementById("deleteWarningModal");
    const deleteWarningMessage = document.getElementById("deleteWarningMessage");
    const cancelDeleteWarning = document.getElementById("cancelDeleteWarning");
    const confirmDeleteWarning = document.getElementById("confirmDeleteWarning");
    
    // State variables
    let isManaging = false;
    let courseToDelete = null;
    let courseToEdit = null;
    let itemToDelete = null;
    let deleteType = null;
    let selectedSubjects = [];
    let editSelectedSubjects = [];

    function getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }

    // Modal utility functions
    const closeModalById = (id) => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.add("hidden");
        }
    };

    const openModalById = (id) => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.remove("hidden");
        }
    };

    // COUNT TOTAL STRANDS 
    function updateTotalStrandsCount() {
    const courseItems = document.querySelectorAll('.courseItem');
    const totalCountElement = document.getElementById('totalCoursesCount');
    totalCountElement.textContent = courseItems.length;
    }   

    updateTotalStrandsCount();

    //SEARCH STRANDS
    function setupStrandSearch() {
    const searchInput = document.getElementById("searchCourse");
    const courseItems = document.querySelectorAll(".courseItem");

    searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase().trim();

        courseItems.forEach(item => {
            const courseName = item.dataset.courseName?.toLowerCase() || "";
            item.style.display = courseName.includes(query) ? "" : "none";
        });

        updateTotalStrandsCount(); // Optional: update visible total
    });
    }

    setupStrandSearch();


    // Load Academic Years and Semesters
    async function loadAcademicYears() {
        try {
            const response = await fetch('/supervisor/academic-years/');
            const data = await response.json();
            populateSelect(academicYearSelect, data.academic_years, 'id', 'name');
            populateSelect(editAcademicYearSelect, data.academic_years, 'id', 'name');
        } catch (error) {
            console.error('Error loading academic years:', error);
        }
    }

    async function loadSemesters() {
        try {
            const response = await fetch('/supervisor/semesters/');
            const data = await response.json();
            populateSelect(semesterSelect, data.semesters, 'id', 'name');
            populateSelect(editSemesterSelect, data.semesters, 'id', 'name');
        } catch (error) {
            console.error('Error loading semesters:', error);
        }
    }

    function populateSelect(selectElement, items, valueKey, textKey) {
        // Clear existing options except the first one
        while (selectElement.children.length > 1) {
            selectElement.removeChild(selectElement.lastChild);
        }
        
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item[valueKey];
            option.textContent = item[textKey];
            selectElement.appendChild(option);
        });
    }

    // Subject management functions
    function addSubjectToList(subjectName, subjectCode, container, subjectsArray) {
        if (!subjectName.trim()) return;
        
        const subject = {
            name: subjectName.trim(),
            code: subjectCode.trim() || null
        };
        
        subjectsArray.push(subject);
        
        const subjectItem = document.createElement('div');
        subjectItem.className = 'flex items-center justify-between bg-gray-100 p-2 rounded';
        subjectItem.innerHTML = `
            <span class="text-sm">
                ${subject.code ? `${subject.code} - ` : ''}${subject.name}
            </span>
            <button type="button" class="text-red-600 hover:text-red-800 text-sm" onclick="this.parentElement.remove(); removeSubject('${subject.name}', subjectsArray)">
                ✕
            </button>
        `;
        
        container.appendChild(subjectItem);
    }

    function removeSubject(subjectName, subjectsArray) {
        const index = subjectsArray.findIndex(s => s.name === subjectName);
        if (index > -1) {
            subjectsArray.splice(index, 1);
        }
    }

    // Course form submission
    courseForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const courseName = courseNameInput.value.trim();
        const courseCode = courseCodeInput.value.trim();
        const academicYear = academicYearSelect.value;
        const semester = semesterSelect.value;

        if (!courseName || !academicYear || !semester) {
            alert("Please fill in all required fields.");
            return;
        }

        const createCourseUrl = document.getElementById("courseFormWrapper").dataset.createUrl;
        
        try {
            const response = await fetch(createCourseUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken()
                },
                body: JSON.stringify({
                    name: courseName,
                    course_code: courseCode,
                    academic_year: academicYear,
                    semester: semester,
                    subjects: selectedSubjects
                })
            });
            
            const data = await response.json();
            
            if (data.status === "success") {
                // Reset form and close modal
                courseForm.reset();
                selectedSubjects = [];
                subjectsList.innerHTML = '';
                closeModalById("addCourseModal");
                
                // Reload page to show new course
                setTimeout(() => {
                    location.reload();
                }, 300);
            } else {
                alert("Failed to create course. Please try again.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("There was an error creating the course.");
        }
    });

    // Edit course form submission
    editCourseForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const updatedCourseName = editCourseNameInput.value.trim();
        const updatedCourseCode = editCourseCodeInput.value.trim();
        const updatedAcademicYear = editAcademicYearSelect.value;
        const updatedSemester = editSemesterSelect.value;

        if (!updatedCourseName || !updatedAcademicYear || !updatedSemester) {
            alert("Please fill in all required fields.");
            return;
        }

        if (courseToEdit) {
            const courseId = courseToEdit.getAttribute("data-course-id");

            try {
                const response = await fetch(`/update-course/${courseId}/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": getCSRFToken(),
                    },
                    body: JSON.stringify({
                        name: updatedCourseName,
                        course_code: updatedCourseCode,
                        academic_year: updatedAcademicYear,
                        semester: updatedSemester,
                        subjects: editSelectedSubjects
                    }),
                });
                
                const data = await response.json();
                
                if (data.status === "success") {
                    closeModalById("editCourseModal");
                    courseToEdit = null;
                    editSelectedSubjects = [];
                    setTimeout(() => {
                        location.reload();
                    }, 300);
                } else {
                    alert("Failed to update course: " + data.message);
                }
            } catch (error) {
                console.error("Error updating course:", error);
            }
        }
    });

    // Subject buttons
    addSubjectBtn.addEventListener("click", () => {
        addSubjectToList(
            newSubjectNameInput.value,
            newSubjectCodeInput.value,
            subjectsList,
            selectedSubjects
        );
        newSubjectNameInput.value = '';
        newSubjectCodeInput.value = '';
    });

    editAddSubjectBtn.addEventListener("click", () => {
        addSubjectToList(
            editNewSubjectNameInput.value,
            editNewSubjectCodeInput.value,
            editSubjectsList,
            editSelectedSubjects
        );
        editNewSubjectNameInput.value = '';
        editNewSubjectCodeInput.value = '';
    });

    // Academic Year management
    manageAcademicYearsBtn.addEventListener("click", () => {
        openModalById("academicYearModal");
        loadAcademicYearsList();
    });

    closeAcademicYearModal.addEventListener("click", () => {
        closeModalById("academicYearModal");
    });

    addAcademicYearBtn.addEventListener("click", async () => {
        const name = newAcademicYearInput.value.trim();
        if (!name) {
            alert("Please enter an academic year name.");
            return;
        }

        try {
            const response = await fetch('/supervisor/academic-year/create/', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken()
                },
                body: JSON.stringify({ name: name })
            });
            
            const data = await response.json();
            
            if (data.status === "success") {
                newAcademicYearInput.value = '';
                loadAcademicYearsList();
                loadAcademicYears();
            } else {
                alert("Failed to create academic year.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("There was an error creating the academic year.");
        }
    });

    async function loadAcademicYearsList() {
        try {
            const response = await fetch('/supervisor/academic-years/');
            const data = await response.json();
            
            academicYearsList.innerHTML = '';
            data.academic_years.forEach(year => {
                const yearItem = document.createElement('div');
                yearItem.className = 'flex items-center justify-between bg-white p-3 rounded border';
                yearItem.innerHTML = `
                    <span class="font-medium">${year.name}</span>
                    <div class="flex gap-2">
                        <button class="text-blue-600 hover:text-blue-800" onclick="editAcademicYear(${year.id}, '${year.name}')">✏️</button>
                        <button class="text-red-600 hover:text-red-800" onclick="deleteAcademicYear(${year.id}, '${year.name}')">🗑️</button>
                    </div>
                `;
                academicYearsList.appendChild(yearItem);
            });
        } catch (error) {
            console.error('Error loading academic years list:', error);
        }
    }

    // Semester management
    manageSemestersBtn.addEventListener("click", () => {
        openModalById("semesterModal");
        loadSemestersList();
    });

    closeSemesterModal.addEventListener("click", () => {
        closeModalById("semesterModal");
    });

    addSemesterBtn.addEventListener("click", async () => {
        const name = newSemesterSelect.value;
        if (!name) {
            alert("Please select a semester.");
            return;
        }

        try {
            const response = await fetch('/supervisor/semester/create/', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken()
                },
                body: JSON.stringify({ name: name })
            });
            
            const data = await response.json();
            
            if (data.status === "success") {
                newSemesterSelect.value = '';
                loadSemestersList();
                loadSemesters();
            } else {
                alert("Failed to create semester.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("There was an error creating the semester.");
        }
    });

    async function loadSemestersList() {
        try {
            const response = await fetch('/supervisor/semesters/');
            const data = await response.json();
            
            semestersList.innerHTML = '';
            data.semesters.forEach(semester => {
                const semesterItem = document.createElement('div');
                semesterItem.className = 'flex items-center justify-between bg-white p-3 rounded border';
                semesterItem.innerHTML = `
                    <span class="font-medium">${semester.name}</span>
                    <div class="flex gap-2">
                        <button class="text-blue-600 hover:text-blue-800" onclick="editSemester(${semester.id}, '${semester.name}')">✏️</button>
                        <button class="text-red-600 hover:text-red-800" onclick="deleteSemester(${semester.id}, '${semester.name}')">🗑️</button>
                    </div>
                `;
                semestersList.appendChild(semesterItem);
            });
        } catch (error) {
            console.error('Error loading semesters list:', error);
        }
    }

    // Delete warning modal
    cancelDeleteWarning.addEventListener("click", () => {
        closeModalById("deleteWarningModal");
        itemToDelete = null;
        deleteType = null;
    });

    confirmDeleteWarning.addEventListener("click", async () => {
        if (!itemToDelete || !deleteType) return;

        try {
            const response = await fetch(`/supervisor/${deleteType}/${itemToDelete}/delete/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken()
                }
            });
            
            const data = await response.json();
            
            if (data.status === "success") {
                closeModalById("deleteWarningModal");
                if (deleteType === 'academic-year') {
                    loadAcademicYearsList();
                    loadAcademicYears();
                } else if (deleteType === 'semester') {
                    loadSemestersList();
                    loadSemesters();
                }
                setTimeout(() => {
                    location.reload();
                }, 300);
            } else {
                alert("Failed to delete item.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("There was an error deleting the item.");
        }
        
        itemToDelete = null;
        deleteType = null;
    });

    // Global functions for edit/delete operations
    window.editAcademicYear = function(id, name) {
        const newName = prompt("Enter new academic year name:", name);
        if (newName && newName.trim() !== name) {
            updateAcademicYear(id, newName.trim());
        }
    };

    window.deleteAcademicYear = function(id, name) {
        itemToDelete = id;
        deleteType = 'academic-year';
        deleteWarningMessage.textContent = `Are you sure you want to delete the academic year "${name}"? This will also delete all courses associated with this academic year.`;
        openModalById("deleteWarningModal");
    };

    window.editSemester = function(id, name) {
        const newName = prompt("Enter new semester name:", name);
        if (newName && newName.trim() !== name) {
            updateSemester(id, newName.trim());
        }
    };

    window.deleteSemester = function(id, name) {
        itemToDelete = id;
        deleteType = 'semester';
        deleteWarningMessage.textContent = `Are you sure you want to delete the semester "${name}"? This will also delete all courses associated with this semester.`;
        openModalById("deleteWarningModal");
    };

    async function updateAcademicYear(id, name) {
        try {
            const response = await fetch(`/supervisor/academic-year/${id}/update/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken()
                },
                body: JSON.stringify({ name: name })
            });
            
            const data = await response.json();
            
            if (data.status === "success") {
                loadAcademicYearsList();
                loadAcademicYears();
            } else {
                alert("Failed to update academic year.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("There was an error updating the academic year.");
        }
    }

    async function updateSemester(id, name) {
        try {
            const response = await fetch(`/supervisor/semester/${id}/update/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken()
                },
                body: JSON.stringify({ name: name })
            });
            
            const data = await response.json();
            
            if (data.status === "success") {
                loadSemestersList();
                loadSemesters();
            } else {
                alert("Failed to update semester.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("There was an error updating the semester.");
        }
    }

    // Existing course management functionality
    addCourseBtn.addEventListener("click", () => {
        openModalById("addCourseModal");
        loadAcademicYears();
        loadSemesters();
    });

    closeModal.addEventListener("click", () => {
        closeModalById("addCourseModal");
        courseForm.reset();
        selectedSubjects = [];
        subjectsList.innerHTML = '';
    });

    closeEditModal.addEventListener("click", () => {
        closeModalById("editCourseModal");
        courseToEdit = null;
        editSelectedSubjects = [];
        editSubjectsList.innerHTML = '';
    });

    // Initialize
    loadAcademicYears();
    loadSemesters();

    // Course management functionality
    manageCoursesBtn.addEventListener("click", () => {
        isManaging = !isManaging;
        const editButtons = document.querySelectorAll(".editCourse");
        const deleteButtons = document.querySelectorAll(".deleteCourse");
        
        editButtons.forEach(btn => {
            btn.classList.toggle("hidden", !isManaging);
        });
        
        deleteButtons.forEach(btn => {
            btn.classList.toggle("hidden", !isManaging);
        });
        
        manageCoursesBtn.textContent = isManaging ? "Done Managing" : "⚙️ Manage Strand";
        manageCoursesBtn.className = isManaging 
            ? "bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700" 
            : "bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-600";
    });

    function bindCourseActionButtons() {
        // Bind edit buttons
        document.querySelectorAll(".editCourse").forEach(btn => {
            btn.addEventListener("click", function() {
                const courseItem = this.closest(".courseItem");
                courseToEdit = courseItem;
                
                const courseName = courseItem.getAttribute("data-course-name");
                const courseId = courseItem.getAttribute("data-course-id");
                
                editCourseNameInput.value = courseName;
                editCourseCodeInput.value = ""; // You might want to get this from the course data
                
                // Load current course data for editing
                loadCourseForEditing(courseId);
                
                openModalById("editCourseModal");
            });
        });

        // Bind delete buttons
        document.querySelectorAll(".deleteCourse").forEach(btn => {
            btn.addEventListener("click", function() {
                const courseItem = this.closest(".courseItem");
                courseToDelete = courseItem;
                
                const courseName = courseItem.getAttribute("data-course-name");
                deleteCourseMessage.textContent = `Are you sure you want to delete the strand "${courseName}"?`;
                openModalById("deleteCourseModal");
            });
        });
    }

    async function loadCourseForEditing(courseId) {
        try {
            // For now, we'll just populate the form with basic data
            // In a real implementation, you'd fetch the course data from the server
            editSelectedSubjects = [];
            editSubjectsList.innerHTML = '';
            
            // Set default values for academic year and semester
            await loadAcademicYears();
            await loadSemesters();
        } catch (error) {
            console.error("Error loading course for editing:", error);
        }
    }

    // Course deletion
    cancelDeleteCourseBtn.addEventListener("click", () => {
        closeModalById("deleteCourseModal");
        courseToDelete = null;
    });

    confirmDeleteCourseBtn.addEventListener("click", async () => {
        if (!courseToDelete) {
            alert("No course selected for deletion.");
            return;
        }

        const courseId = courseToDelete.getAttribute("data-course-id");

        try {
            const response = await fetch("/supervisor/delete-course/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCSRFToken()
                },
                body: JSON.stringify({ course_id: courseId })
            });
            
            const data = await response.json();
            
            if (data.status === "success") {
                courseToDelete.remove();
                closeModalById("deleteCourseModal");
                courseToDelete = null;
                updateTotalCoursesCount();
                
                // Check if no courses left
                if (document.querySelectorAll(".courseItem").length === 0) {
                    const noCoursesMessage = document.createElement("p");
                    noCoursesMessage.id = "noCoursesMessage";
                    noCoursesMessage.className = "text-gray-600";
                    noCoursesMessage.textContent = "No courses yet. Click \"Add Course\" to create one.";
                    courseList.appendChild(noCoursesMessage);
                }
            } else {
                alert("Failed to delete course: " + data.message);
            }
        } catch (error) {
            console.error("Error:", error);
            alert("There was an error deleting the course.");
        }
    });

    function updateTotalCoursesCount() {
        const totalCourses = document.querySelectorAll(".courseItem").length;
        const totalCoursesElement = document.getElementById("totalCoursesCount");
        if (totalCoursesElement) {
            totalCoursesElement.textContent = totalCourses;
        }
    }

    // Bind course action buttons on page load
    bindCourseActionButtons();
});
