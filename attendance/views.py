from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login
from django.contrib import messages
from django.urls import reverse
from .models import CustomUser, Course  
from urllib.parse import unquote
from django.contrib.auth.hashers import make_password
from django.contrib.auth import get_user_model
from django.contrib import messages
from django.contrib.auth import logout
from django.shortcuts import redirect
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from django.views.decorators.http import require_POST
from .models import Course, CourseStudent
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.forms import PasswordChangeForm
from django.db import IntegrityError
from venv import logger
from django.contrib.auth.hashers import check_password
from datetime import datetime
from django.utils.timezone import now
from django.utils import timezone
from django.utils.timezone import localdate
from .models import AcademicYear, Semester, Subject
from django.views.decorators.http import require_http_methods
from .models import StudentAuditLog
from django.db import models
import calendar
from django.http import HttpResponseForbidden

# ---------- HOME VIEWS ----------

def home(request):
    return render(request, 'Home/index.html')

def about(request):
    return render(request, 'Home/about.html')

# ---------- AUTHENTICATION ----------

def supervisor_login(request):
    if request.method == 'POST':
        email = request.POST['email']
        password = request.POST['password']
        user = authenticate(request, username=email, password=password)
        if user is not None and user.role == 'supervisor':
            login(request, user)
            return redirect('supervisor_dashboard')
        else:
            messages.error(request, 'Invalid credentials or not a supervisor.')
            return render(request, 'Home/supervisor-login.html', {'email': email})
        
    return render(request, 'Home/supervisor-login.html')

def student_login(request):
    # Student login using LRN (student_id) as username
    if request.method == 'POST':
        lrn = request.POST['lrn']
        password = request.POST['password']
        user = authenticate(request, username=lrn, password=password)  # Uses LRNAuthBackend

        if user is not None and user.role == 'student':
            login(request, user)
            if user.must_change_password:
                return redirect('student_change_password')
            return redirect('student_dashboard')
        else:
            messages.error(request, 'Invalid credentials or not a student.')
            return render(request, 'Home/student-login.html', {'lrn': lrn})

    return render(request, 'Home/student-login.html')

def supervisor_logout(request):
    logout(request)
    return redirect('supervisor_login')

# ---------- SUPERVISOR VIEWS ----------

@login_required
def supervisor_dashboard(request):
    if request.user.role == 'supervisor':
        # Create default academic years if none exist
        if not AcademicYear.objects.exists():
            current_year = timezone.now().year
            for i in range(3):
                year_start = current_year + i
                year_end = year_start + 1
                AcademicYear.objects.create(name=f"{year_start}-{year_end}")
        
        # Create default semesters if none exist
        if not Semester.objects.exists():
            Semester.objects.create(name="1st Sem")
            Semester.objects.create(name="2nd Sem")
        
        courses = Course.objects.all()
        academic_years = AcademicYear.objects.all()
        semesters = Semester.objects.all()
        
        # Add course counts for each academic year and semester
        for year in academic_years:
            year.course_count = year.courses.count()
        
        for semester in semesters:
            semester.course_count = semester.courses.count()
        
        return render(request, 'Supervisor/supervisor-dashboard.html', {
            'courses': courses,
            'academic_years': academic_years,
            'semesters': semesters
        })
    return redirect('supervisor_login')

@login_required
@require_POST
def create_course(request):
    try:
        data = json.loads(request.body)
        name = data.get("name")
        course_code = data.get("course_code", "")
        academic_year_id = data.get("academic_year")
        semester_id = data.get("semester")
        subjects_data = data.get("subjects", [])

        # Validate required fields
        if not name or not academic_year_id or not semester_id:
            return JsonResponse({"status": "error", "message": "Missing required fields."}, status=400)

        # Get AcademicYear and Semester objects
        try:
            academic_year = AcademicYear.objects.get(id=academic_year_id)
            semester = Semester.objects.get(id=semester_id)
        except (AcademicYear.DoesNotExist, Semester.DoesNotExist):
            return JsonResponse({"status": "error", "message": "Invalid academic year or semester."}, status=400)

        # Create the course
        course = Course.objects.create(
            name=name,
            course_code=course_code,
            academic_year=academic_year,
            semester=semester,
            supervisor=request.user
        )

        # Add default subjects
        for subject_data in subjects_data:
            subject_name = subject_data.get("name")
            subject_code = subject_data.get("code")
            
            if subject_name:
                # Create or get existing subject
                subject, created = Subject.objects.get_or_create(
                    name=subject_name,
                    defaults={'code': subject_code}
                )
                course.default_subjects.add(subject)

        return JsonResponse({
            "status": "success",
            "course": {
                "id": course.id,
                "name": course.name,
                "course_code": course.course_code,
                "academic_year": course.academic_year.name,
                "semester": course.semester.name,
            }
        })

    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)

@login_required
@require_POST
def delete_course(request):
    try:
        data = json.loads(request.body)
        course_id = data.get("course_id")

        course = Course.objects.filter(id=course_id, supervisor=request.user).first()
        if not course:
            return JsonResponse({"status": "error", "message": "Course not found."}, status=404)

        course.delete()
        return JsonResponse({"status": "success"})

    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)

@login_required
@require_POST
def update_course(request, course_id):
    try:
        data = json.loads(request.body)
        name = data.get("name")
        course_code = data.get("course_code", "")
        academic_year_id = data.get("academic_year")
        semester_id = data.get("semester")
        subjects_data = data.get("subjects", [])

        # Validate required fields
        if not name or not academic_year_id or not semester_id:
            return JsonResponse({"status": "error", "message": "Missing required fields."}, status=400)

        # Get the course
        try:
            course = Course.objects.get(id=course_id, supervisor=request.user)
        except Course.DoesNotExist:
            return JsonResponse({"status": "error", "message": "Course not found."}, status=404)

        # Get AcademicYear and Semester objects
        try:
            academic_year = AcademicYear.objects.get(id=academic_year_id)
            semester = Semester.objects.get(id=semester_id)
        except (AcademicYear.DoesNotExist, Semester.DoesNotExist):
            return JsonResponse({"status": "error", "message": "Invalid academic year or semester."}, status=400)

        # Update course fields
        course.name = name
        course.course_code = course_code
        course.academic_year = academic_year
        course.semester = semester
        course.save()

        # Clear existing subjects and add new ones
        course.default_subjects.clear()
        for subject_data in subjects_data:
            subject_name = subject_data.get("name")
            subject_code = subject_data.get("code")
            
            if subject_name:
                # Create or get existing subject
                subject, created = Subject.objects.get_or_create(
                    name=subject_name,
                    defaults={'code': subject_code}
                )
                course.default_subjects.add(subject)

        return JsonResponse({"status": "success"})

    except Course.DoesNotExist:
        return JsonResponse({"status": "error", "message": "Course not found."}, status=404)
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)

@login_required
def supervisor_profile(request):
    return render(request, 'Supervisor/profile.html')

@login_required
def change_password(request):
    if request.method == 'POST':
        current_password = request.POST.get('current_password')
        new_password = request.POST.get('new_password')
        confirm_password = request.POST.get('confirm_password')

        user = request.user

        if not user.check_password(current_password):
            messages.error(request, 'Your current password is incorrect.')
        elif new_password != confirm_password:
            messages.error(request, 'New passwords do not match.')
        elif len(new_password) < 8:
            messages.error(request, 'New password must be at least 8 characters.')
        else:
            user.set_password(new_password)
            user.save()
            update_session_auth_hash(request, user)  # Keeps the user logged in after password change
            messages.success(request, 'Your password has been successfully updated.')

    return redirect('supervisor_profile')

@login_required
def view_students(request, course_id):
    # Get the course (ensure the supervisor owns it)
    course = get_object_or_404(Course, id=course_id, supervisor=request.user)

    # Get students for this course
    student_links = CourseStudent.objects.filter(course=course).select_related('student')
    students = [link.student for link in student_links]
    
    return render(request, 'Supervisor/view-students.html', {
        'course': course,
        'students': students,
    })

CustomUser = get_user_model()

@csrf_exempt
def add_student(request):
    if request.method == 'POST':
        print("Received POST to add_student ✅")

        # Getting data from the POST request
        name = request.POST.get('name')
        student_id = request.POST.get('student_id')
        email = request.POST.get('email')
        password = request.POST.get('password')  # This is the student_id used as password
        course_id = request.POST.get('course_id')

        print("Data received:", name, student_id, email, course_id)

        # Basic validation
        if not all([name, student_id, email, password, course_id]):
            return JsonResponse({'success': False, 'error': 'Missing fields'})

        # Split full name into first and last
        name_parts = name.strip().split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''

        # Check for duplicate email
        if CustomUser.objects.filter(email=email).exists():
            return JsonResponse({'success': False, 'error': 'Email already exists'})
        
        # Check for duplicate student_id
        if CustomUser.objects.filter(student_id=student_id).exists():
            return JsonResponse({'success': False, 'error': 'Student ID already exists'})

        # Create user with student ID as default password
        user = CustomUser.objects.create_user(
            email=email,
            password=password,  # student_id as password
            student_id=student_id,
            first_name=first_name,
            last_name=last_name,
            role='student',
            must_change_password=True
        )

        # Enroll user in the course
        try:
            course = Course.objects.get(id=course_id)
            CourseStudent.objects.create(course=course, student=user)
        except Course.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Course not found'})

        return JsonResponse({'success': True})

    return JsonResponse({'success': False, 'error': 'Invalid request'})

@csrf_exempt
@require_POST
def edit_student(request):
    if request.user.role != 'supervisor':
        return HttpResponseForbidden('You are not authorized to perform this action.')
    try:
        data = json.loads(request.body)
        student_id = data.get('student_id')
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')

        student = CustomUser.objects.get(student_id=student_id, role='student')

        # Update name
        name_parts = name.strip().split(' ', 1)
        student.first_name = name_parts[0]
        student.last_name = name_parts[1] if len(name_parts) > 1 else ''

        # Update email + username
        student.email = email
        student.username = email

        # Optional: Update password
        if password:
            student.set_password(password)

        try:
            student.save()
        except IntegrityError:
            return JsonResponse({'success': False, 'error': 'This email is already registered.'})

        return JsonResponse({'success': True})

    except CustomUser.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Student not found'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@csrf_exempt
@require_POST
def delete_student(request):
    if request.user.role != 'supervisor':
        return HttpResponseForbidden('You are not authorized to perform this action.')
    try:
        data = json.loads(request.body)
        student_id = data.get('student_id')

        # Check if student exists
        student = CustomUser.objects.get(student_id=student_id, role='student')
        
        # Perform deletion
        student.delete()

        return JsonResponse({'success': True})
    except CustomUser.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Student with ID not found or invalid role.'})
    except Exception as e:
        # Log the error for better debugging
        logger.error(f"Error while deleting student: {str(e)}")
        return JsonResponse({'success': False, 'error': f'An unexpected error occurred: {str(e)}'})

# ---------- STUDENT VIEWS ----------

@login_required
def student_change_password(request):
    if request.user.role != 'student':
        return HttpResponseForbidden('You are not authorized to perform this action.')
    if request.method == 'POST':
        new_password = request.POST.get('new_password')
        confirm_password = request.POST.get('confirm_password')

        if new_password != confirm_password:
            messages.error(request, "Passwords do not match.")
            return redirect('student_change_password')

        user = request.user
        user.set_password(new_password)
        print("Password after set_password (before save):", user.password)  # Should be long and start with "pbkdf2_sha256$"
        user.must_change_password = False
        user.save()
        print("Password after save:", user.password)

        logout(request)
        messages.success(request, "Password changed successfully. Please log in again.")
        return redirect('student_login')

    return render(request, 'Student/student-change-password.html')

def student_logout(request):
    if request.user.role != 'student':
        return HttpResponseForbidden('You are not authorized to perform this action.')
    logout(request)
    return redirect('student_login')

@login_required
def student_dashboard(request):
    if request.user.role != 'student':
        return HttpResponseForbidden('You are not authorized to perform this action.')
    student = request.user

    # Get course information
    course_student = CourseStudent.objects.filter(student=student).first()
    course = course_student.course if course_student else None

    context = {
        "student": student,
        "course": course,
    }

    return render(request, 'Student/student-dashboard.html', context)

@login_required
def student_profile_settings(request):
    if request.user.role != 'student':
        return HttpResponseForbidden('You are not authorized to perform this action.')
    course_student = CourseStudent.objects.filter(student=request.user).first()
    return render(request, 'Student/student-profile-settings.html', {
        'course_student': course_student,
    })

# Academic Year CRUD
@login_required
def academic_year_list(request):
    if request.user.role != 'supervisor':
        return HttpResponseForbidden('You are not authorized to perform this action.')
    # Placeholder: Return all academic years
    years = list(AcademicYear.objects.all().values())
    return JsonResponse({'academic_years': years})

@login_required
@require_http_methods(["POST"])
def academic_year_create(request):
    if request.user.role != 'supervisor':
        return HttpResponseForbidden('You are not authorized to perform this action.')
    # Placeholder: Create a new academic year
    data = json.loads(request.body)
    name = data.get('name')
    year = AcademicYear.objects.create(name=name)
    return JsonResponse({'status': 'success', 'academic_year': {'id': year.id, 'name': year.name}})

@login_required
@require_http_methods(["POST"])
def academic_year_update(request, pk):
    if request.user.role != 'supervisor':
        return HttpResponseForbidden('You are not authorized to perform this action.')
    # Placeholder: Update an academic year
    data = json.loads(request.body)
    name = data.get('name')
    year = get_object_or_404(AcademicYear, pk=pk)
    year.name = name
    year.save()
    return JsonResponse({'status': 'success'})

@login_required
@require_http_methods(["POST"])
def academic_year_delete(request, pk):
    if request.user.role != 'supervisor':
        return HttpResponseForbidden('You are not authorized to perform this action.')
    # Placeholder: Delete an academic year (add warning logic in frontend)
    year = get_object_or_404(AcademicYear, pk=pk)
    year.delete()
    return JsonResponse({'status': 'success'})

# Semester CRUD
@login_required
def semester_list(request):
    if request.user.role != 'supervisor':
        return HttpResponseForbidden('You are not authorized to perform this action.')
    semesters = list(Semester.objects.all().values())
    return JsonResponse({'semesters': semesters})

@login_required
@require_http_methods(["POST"])
def semester_create(request):
    data = json.loads(request.body)
    name = data.get('name')
    semester = Semester.objects.create(name=name)
    return JsonResponse({'status': 'success', 'semester': {'id': semester.id, 'name': semester.name}})

@login_required
@require_http_methods(["POST"])
def semester_update(request, pk):
    if request.user.role != 'supervisor':
        return HttpResponseForbidden('You are not authorized to perform this action.')
    data = json.loads(request.body)
    name = data.get('name')
    semester = get_object_or_404(Semester, pk=pk)
    semester.name = name
    semester.save()
    return JsonResponse({'status': 'success'})

@login_required
@require_http_methods(["POST"])
def semester_delete(request, pk):
    if request.user.role != 'supervisor':
        return HttpResponseForbidden('You are not authorized to perform this action.')
    semester = get_object_or_404(Semester, pk=pk)
    semester.delete()
    return JsonResponse({'status': 'success'})

# Student Masterlist Views (Updated for CustomUser)
@login_required
def student_masterlist(request):
    if request.user.role != 'supervisor':
        return HttpResponseForbidden('You are not authorized to access this page.')
    query = request.GET.get('q', '')
    filter_strand = request.GET.get('strand', '')
    filter_gender = request.GET.get('gender', '')
    filter_month = request.GET.get('month', '')

    students = CustomUser.objects.filter(role='student')

    if query:
        students = students.filter(
            models.Q(student_id__icontains=query) |
            models.Q(first_name__icontains=query) |
            models.Q(last_name__icontains=query) |
            models.Q(email__icontains=query)
        )
    if filter_strand:
        students = students.filter(coursestudent__course__id=filter_strand)
    if filter_gender:
        students = students.filter(gender=filter_gender)
    if filter_month:
        students = students.filter(date_of_birth__month=filter_month)

    strands = Course.objects.all()
    months = [(i, calendar.month_name[i]) for i in range(1, 13)]

    return render(request, 'Supervisor/student_masterlist.html', {
        'students': students,
        'strands': strands,
        'months': months,
        'query': query,
        'filter_strand': filter_strand,
        'filter_gender': filter_gender,
        'filter_month': filter_month,
    })

@login_required
def add_student_masterlist(request):
    if request.user.role != 'supervisor':
        return HttpResponseForbidden('You are not authorized to perform this action.')
    if request.method == 'POST':
        data = json.loads(request.body)
        student_id = data.get('student_id', '').strip()
        first_name = data.get('first_name', '').strip()
        middle_initial = data.get('middle_initial', '').strip()
        last_name = data.get('last_name', '').strip()
        email = data.get('email', '').strip()
        gender = data.get('gender', '').strip()
        date_of_birth = data.get('date_of_birth', '').strip()
        
        # --- Validation ---
        if not student_id or not first_name or not last_name or not email or not gender or not date_of_birth:
            return JsonResponse({'success': False, 'error': 'All required fields must be filled.'})
        if not student_id.isdigit() or len(student_id) != 12:
            return JsonResponse({'success': False, 'error': 'Student ID must be a 12-digit number.'})
        if CustomUser.objects.filter(student_id=student_id).exists():
            return JsonResponse({'success': False, 'error': 'Student ID already exists.'})
        if CustomUser.objects.filter(email=email).exists():
            return JsonResponse({'success': False, 'error': 'Email already exists.'})
        from django.core.validators import validate_email
        from django.core.exceptions import ValidationError
        try:
            validate_email(email)
        except ValidationError:
            return JsonResponse({'success': False, 'error': 'Invalid email address.'})
        
        # Create user with last name as initial password
        password = last_name.capitalize()
        user = CustomUser.objects.create_user(
            email=email,
            password=password,
            role='student',
            student_id=student_id,
            first_name=first_name,
            last_name=last_name,
            middle_initial=middle_initial,
            gender=gender,
            date_of_birth=date_of_birth,
            must_change_password=True,
        )
        
        # --- Audit Log ---
        StudentAuditLog.objects.create(
            supervisor=request.user,
            action='add',
            student_id=student_id,
            student_name=f"{last_name}, {first_name}",
            details=f"Added student with ID {student_id} and email {email}."
        )
        return JsonResponse({'success': True, 'student': {
            'id': user.id,
            'student_id': user.student_id,
            'first_name': user.first_name,
            'middle_initial': user.middle_initial,
            'last_name': user.last_name,
            'email': user.email,
            'gender': user.gender,
            'date_of_birth': str(user.date_of_birth),
        }})
    return JsonResponse({'success': False, 'error': 'Invalid request'})

@login_required
def edit_student_masterlist(request, pk):
    if request.user.role != 'supervisor':
        return HttpResponseForbidden('You are not authorized to perform this action.')
    student = get_object_or_404(CustomUser, pk=pk, role='student')
    if request.method == 'POST':
        data = json.loads(request.body)
        student_id = data.get('student_id', student.student_id).strip()
        first_name = data.get('first_name', student.first_name).strip()
        middle_initial = data.get('middle_initial', student.middle_initial).strip() if data.get('middle_initial') is not None else student.middle_initial
        last_name = data.get('last_name', student.last_name).strip()
        email = data.get('email', student.email).strip()
        gender = data.get('gender', student.gender).strip()
        date_of_birth = data.get('date_of_birth', student.date_of_birth)
        
        # --- Validation ---
        if not student_id or not first_name or not last_name or not email or not gender or not date_of_birth:
            return JsonResponse({'success': False, 'error': 'All required fields must be filled.'})
        if not student_id.isdigit() or len(student_id) != 12:
            return JsonResponse({'success': False, 'error': 'Student ID must be a 12-digit number.'})
        if CustomUser.objects.filter(student_id=student_id).exclude(pk=pk).exists():
            return JsonResponse({'success': False, 'error': 'Student ID already exists.'})
        if CustomUser.objects.filter(email=email).exclude(pk=pk).exists():
            return JsonResponse({'success': False, 'error': 'Email already exists.'})
        from django.core.validators import validate_email
        from django.core.exceptions import ValidationError
        try:
            validate_email(email)
        except ValidationError:
            return JsonResponse({'success': False, 'error': 'Invalid email address.'})
        
        # --- Audit log: capture changes ---
        changes = []
        if student.student_id != student_id:
            changes.append(f"Student ID: {student.student_id} → {student_id}")
        if student.first_name != first_name:
            changes.append(f"First Name: {student.first_name} → {first_name}")
        if student.middle_initial != middle_initial:
            changes.append(f"Middle Initial: {student.middle_initial} → {middle_initial}")
        if student.last_name != last_name:
            changes.append(f"Last Name: {student.last_name} → {last_name}")
        if student.email != email:
            changes.append(f"Email: {student.email} → {email}")
        if student.gender != gender:
            changes.append(f"Gender: {student.gender} → {gender}")
        if str(student.date_of_birth) != str(date_of_birth):
            changes.append(f"Date of Birth: {student.date_of_birth} → {date_of_birth}")
        
        # --- Save changes ---
        student.student_id = student_id
        student.first_name = first_name
        student.middle_initial = middle_initial
        student.last_name = last_name
        student.email = email
        student.gender = gender
        student.date_of_birth = date_of_birth
        student.save()
        
        # --- Audit Log ---
        StudentAuditLog.objects.create(
            supervisor=request.user,
            action='edit',
            student_id=student_id,
            student_name=f"{last_name}, {first_name}",
            details="; ".join(changes) if changes else "No changes."
        )
        return JsonResponse({'success': True})
    return JsonResponse({'success': False, 'error': 'Invalid request'})

@login_required
def delete_student_masterlist(request, pk):
    if request.user.role != 'supervisor':
        return HttpResponseForbidden('You are not authorized to perform this action.')
    try: 
        student = get_object_or_404(CustomUser, pk=pk, role='student')
    except CustomUser.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Student not found.'}, status=404)
    if request.method == 'POST':
        name = f"{student.last_name}, {student.first_name}"
        student_id = student.student_id
        student.delete()
        # --- Audit Log ---
        StudentAuditLog.objects.create(
            supervisor=request.user,
            action='delete',
            student_id=student_id,
            student_name=name,
            details="Student deleted."
        )
        return JsonResponse({'success': True})
    return JsonResponse({'success': False, 'error': 'Invalid request'})

@login_required
@require_POST
def multiple_delete_students(request):
    if request.user.role != 'supervisor':
        return HttpResponseForbidden('You are not authorized to perform this action.')
    
    try:
        data = json.loads(request.body)
        student_ids = data.get('student_ids', [])
        
        if not student_ids:
            return JsonResponse({'success': False, 'error': 'No students selected for deletion.'})
        
        # Get students to delete
        students_to_delete = CustomUser.objects.filter(id__in=student_ids, role='student')
        
        if len(students_to_delete) != len(student_ids):
            return JsonResponse({'success': False, 'error': 'Some selected students were not found.'})
        
        # Create audit log entries and delete students
        deleted_count = 0
        for student in students_to_delete:
            name = f"{student.last_name}, {student.first_name}"
            student_id = student.student_id
            
            # Create audit log entry
            StudentAuditLog.objects.create(
                supervisor=request.user,
                action='delete',
                student_id=student_id,
                student_name=name,
                details="Student deleted via bulk operation."
            )
            
            # Delete the student
            student.delete()
            deleted_count += 1
        
        return JsonResponse({
            'success': True, 
            'message': f'Successfully deleted {deleted_count} student(s).'
        })
        
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON data.'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'An error occurred: {str(e)}'})

@login_required
def course_detail(request, course_id):
    if request.user.role != 'supervisor':
        return JsonResponse({'error': 'Unauthorized'}, status=403)
    try:
        course = Course.objects.get(id=course_id, supervisor=request.user)
        subjects = [
            {'name': s.name, 'code': s.code}
            for s in course.default_subjects.all()
        ]
        return JsonResponse({
            'id': course.id,
            'name': course.name,
            'course_code': course.course_code,
            'academic_year': course.academic_year.id,
            'semester': course.semester.id,
            'subjects': subjects,
        })
    except Course.DoesNotExist:
        return JsonResponse({'error': 'Course not found'}, status=404)

@login_required
def courses_json(request):
    if request.user.role != 'supervisor':
        return JsonResponse({'error': 'Unauthorized'}, status=403)
    courses = Course.objects.filter(supervisor=request.user).select_related('academic_year', 'semester').prefetch_related('default_subjects')
    data = []
    for course in courses:
        data.append({
            'id': course.id,
            'name': course.name,
            'course_code': course.course_code,
            'academic_year_name': course.academic_year.name,
            'semester_name': course.semester.name,
            'subjects': [
                {'name': s.name, 'code': s.code} for s in course.default_subjects.all()
            ]
        })
    return JsonResponse({'courses': data})
