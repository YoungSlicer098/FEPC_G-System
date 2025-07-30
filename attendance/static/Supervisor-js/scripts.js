document.addEventListener("DOMContentLoaded", function () {
    // Modal elements
    const addCourseBtn = document.getElementById("addCourseBtn");
    const closeModal = document.getElementById("closeModal");
    const courseForm = document.getElementById("courseForm");
    const courseList = document.getElementById("courseList");
    const manageCoursesBtn = document.getElementById("manageCoursesBtn");
    const manageAcademicYearsBtn = document.getElementById("manageAcademicYearsBtn");
    const manageSemestersBtn = document.getElementById("manageSemestersBtn");
    
    // Filter elements
    const filterAcademicYear = document.getElementById("filterAcademicYear");
    const filterSemester = document.getElementById("filterSemester");
    const clearFiltersBtn = document.getElementById("clearFilters");
    
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

    function highlightMatch(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    function normalize(text) {
        return (text || "")
            .toLowerCase()
            .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "") // remove leading/trailing non-alphanum
            .replace(/\s+/g, " ") // collapse whitespace
            .trim();
    }

    function setupStrandSearch() {
        const searchInput = document.getElementById("searchCourse");
        const courseList = document.getElementById("courseList");
        const noCoursesMessageId = "noSearchResultsMessage";
        // Store original text for highlight reset
        const originalTexts = new Map();

        function performSearch() {
            const query = normalize(searchInput.value);
            const selectedYear = filterAcademicYear.value;
            const selectedSemester = filterSemester.value;
            let anyVisible = false;

            // Always get the latest course items (in case of dynamic changes)
            const courseItems = courseList.querySelectorAll(".courseItem");

            courseItems.forEach(item => {
                // Elements
                const nameEl = item.querySelector('.course-name');
                const codeEl = item.querySelector('.course-code');
                const yearEl = item.querySelector('.course-academic-year');
                const semEl = item.querySelector('.course-semester');
                const subjEl = item.querySelector('.course-subjects');

                // Store original text for highlight reset
                if (nameEl && !originalTexts.has(nameEl)) originalTexts.set(nameEl, nameEl.textContent || "");
                if (codeEl && !originalTexts.has(codeEl)) originalTexts.set(codeEl, codeEl.textContent || "");
                if (yearEl && !originalTexts.has(yearEl)) originalTexts.set(yearEl, yearEl.textContent || "");
                if (semEl && !originalTexts.has(semEl)) originalTexts.set(semEl, semEl.textContent || "");
                if (subjEl && !originalTexts.has(subjEl)) originalTexts.set(subjEl, subjEl.textContent || "");

                // Gather all searchable text (normalized)
                const courseName = normalize(nameEl?.textContent);
                const courseCode = normalize(codeEl?.textContent);
                const academicYear = normalize(yearEl?.textContent);
                const semester = normalize(semEl?.textContent);
                const subjects = normalize(subjEl?.textContent);

                // Combine all fields for text search
                const searchable = [courseName, courseCode, academicYear, semester, subjects].join(" ");

                // Check if item matches search query
                const matchesSearch = !query || searchable.includes(query);
                
                // Check if item matches year filter
                const matchesYear = !selectedYear || academicYear === normalize(selectedYear);
                
                // Check if item matches semester filter
                const matchesSemester = !selectedSemester || semester === normalize(selectedSemester);

                // Show/hide item based on all filters
                if (matchesSearch && matchesYear && matchesSemester) {
                    item.style.display = "";
                    anyVisible = true;
                } else {
                    item.style.display = "none";
                }

                // Highlight matches or reset
                function highlightOrReset(el, orig) {
                    if (!el) return;
                    if (query) {
                        el.innerHTML = highlightMatch(orig, searchInput.value);
                    } else {
                        el.textContent = orig;
                    }
                }
                highlightOrReset(nameEl, originalTexts.get(nameEl));
                highlightOrReset(codeEl, originalTexts.get(codeEl));
                highlightOrReset(yearEl, originalTexts.get(yearEl));
                highlightOrReset(semEl, originalTexts.get(semEl));
                highlightOrReset(subjEl, originalTexts.get(subjEl));
            });

            // Show/hide "No results" message
            let noMsg = document.getElementById(noCoursesMessageId);
            if (!anyVisible) {
                if (!noMsg) {
                    noMsg = document.createElement("p");
                    noMsg.id = noCoursesMessageId;
                    noMsg.className = "text-gray-600";
                    noMsg.textContent = "No results found.";
                    courseList.appendChild(noMsg);
                }
            } else if (noMsg) {
                noMsg.remove();
            }

            updateTotalStrandsCount(); // Update visible total
        }

        // Add event listeners for search and filters
        searchInput.addEventListener("input", performSearch);
        filterAcademicYear.addEventListener("change", performSearch);
        filterSemester.addEventListener("change", performSearch);
        
        // Clear filters button
        clearFiltersBtn.addEventListener("click", () => {
            searchInput.value = "";
            searchInput.stringify = "";
            filterAcademicYear.value = "";
            filterSemester.value = "";
            performSearch();
            updateFilterButtonState();
        });

        // Update filter button state based on active filters
        function updateFilterButtonState() {
            const hasActiveFilters = searchInput.value || filterAcademicYear.value || filterSemester.value;
            if (hasActiveFilters) {
                clearFiltersBtn.classList.remove('bg-gray-500', 'hover:bg-gray-600');
                clearFiltersBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
                clearFiltersBtn.textContent = 'Clear Filters (Active)';
            } else {
                clearFiltersBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
                clearFiltersBtn.classList.add('bg-gray-500', 'hover:bg-gray-600');
                clearFiltersBtn.textContent = 'Clear Filters';
            }
        }

        // Update button state on any filter change
        searchInput.addEventListener("input", updateFilterButtonState);
        filterAcademicYear.addEventListener("change", updateFilterButtonState);
        filterSemester.addEventListener("change", updateFilterButtonState);
        
        // Initial state
        updateFilterButtonState();
    }

    setupStrandSearch();


    // Load Academic Years and Semesters
    async function loadAcademicYears() {
        try {
            const response = await fetch('/supervisor/academic-years/');
            const data = await response.json();
            populateSelect(academicYearSelect, data.academic_years, 'id', 'name');
            populateSelect(editAcademicYearSelect, data.academic_years, 'id', 'name');
            populateSelect(filterAcademicYear, data.academic_years, 'name', 'name'); // For filter dropdown
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
            populateSelect(filterSemester, data.semesters, 'name', 'name'); // For filter dropdown
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
        // Prevent duplicate by name or code (case-insensitive)
        const nameLower = subjectName.trim().toLowerCase();
        const codeLower = (subjectCode || '').trim().toLowerCase();
        if (subjectsArray.some(s => s.name.toLowerCase() === nameLower || (s.code && s.code.toLowerCase() === codeLower && codeLower))) {
            alert('Duplicate subject name or code.');
            return;
        }
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
                // Refresh filter dropdowns
                setupStrandSearch();
                // Refresh dashboard lists
                refreshDashboardLists();
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
                // Refresh filter dropdowns
                setupStrandSearch();
                // Refresh dashboard lists
                refreshDashboardLists();
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
                // Refresh filter dropdowns
                setupStrandSearch();
                // Refresh dashboard lists
                refreshDashboardLists();
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
                // Refresh filter dropdowns
                setupStrandSearch();
                // Refresh dashboard lists
                refreshDashboardLists();
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
                // Refresh filter dropdowns
                setupStrandSearch();
                // Refresh dashboard lists
                refreshDashboardLists();
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
    setupStrandSearch();
    
    // Add refresh functionality for the lists
    function refreshDashboardLists() {
        // This will be called when academic years or semesters are modified
        setTimeout(() => {
            location.reload();
        }, 500);
    }

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

    // Update: loadCourseForEditing fetches all course data from backend
    async function loadCourseForEditing(courseId) {
        try {
            // Show spinner, disable form
            const spinner = document.getElementById('editCourseLoadingSpinner');
            const form = document.getElementById('editCourseForm');
            spinner.classList.remove('hidden');
            form.classList.add('opacity-50');
            form.querySelectorAll('input, select, button').forEach(el => el.disabled = true);

            // Fetch course details from backend
            const response = await fetch(`/supervisor/course/${courseId}/detail/`);
            const data = await response.json();
            if (data.error) {
                alert(data.error);
                return;
            }

            // Populate form fields
            editCourseNameInput.value = data.name;
            editCourseCodeInput.value = data.course_code || "";
            editAcademicYearSelect.value = data.academic_year;
            editSemesterSelect.value = data.semester;

            // Populate subjects
            editSelectedSubjects = [];
            editSubjectsList.innerHTML = '';
            data.subjects.forEach(subject => {
                addSubjectToList(subject.name, subject.code, editSubjectsList, editSelectedSubjects);
            });
        } catch (error) {
            console.error("Error loading course for editing:", error);
        } finally {
            // Hide spinner, enable form
            const spinner = document.getElementById('editCourseLoadingSpinner');
            const form = document.getElementById('editCourseForm');
            spinner.classList.add('hidden');
            form.classList.remove('opacity-50');
            form.querySelectorAll('input, select, button').forEach(el => el.disabled = false);
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
                location.reload();
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
