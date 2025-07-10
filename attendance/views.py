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
from .models import Attendance 
from django.utils.timezone import now
from django.utils import timezone
from django.utils.timezone import localdate

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

def supervisor_register(request):
    if request.method == 'POST':
        email = request.POST['email']
        password = request.POST['password']
        confirm_password = request.POST['confirm_password']

        if password != confirm_password:
            messages.error(request, "Passwords do not match.")
            return render(request, 'Home/supervisor-register.html', {'email': email})

        if get_user_model().objects.filter(email=email).exists():
            messages.error(request, "Email already in use.")
            return render(request, 'Home/supervisor-register.html', {'email': email})

        user = CustomUser.objects.create_user(
            email=email,
            password=password,
            role='supervisor'
        )
        messages.success(request, "Account created successfully. Please log in.")
        return redirect('supervisor_login')

    return render(request, 'Home/supervisor-register.html')

def intern_login(request):
    if request.method == 'POST':
        email = request.POST['email']
        password = request.POST['password']
        user = authenticate(request, username=email, password=password)  # ✅ Correct usage

        if user is not None and user.role == 'intern':
            login(request, user)

            # 👇 Check if they must change password
            if user.must_change_password:
                return redirect('intern_change_password')

            return redirect('intern_dashboard')  # ✅ Already changed password
        else:
            messages.error(request, 'Invalid credentials or not an intern.')
            return render(request, 'Home/intern-login.html', {'email': email})

    return render(request, 'Home/intern-login.html')


def supervisor_logout(request):
    logout(request)
    return redirect('supervisor_login')

# ---------- SUPERVISOR VIEWS ----------

@login_required
def supervisor_dashboard(request):
    if request.user.role == 'supervisor':
        courses = Course.objects.filter(supervisor=request.user)
        return render(request, 'Supervisor/supervisor-dashboard.html', {'courses': courses})
    return redirect('supervisor_login')

@login_required
@require_POST
def create_course(request):
    try:
        data = json.loads(request.body)
        name = data.get("name")
        academic_year = data.get("academic_year")

        course = Course.objects.create(
            name=name,
            academic_year=academic_year,
            supervisor=request.user
        )

        return JsonResponse({
            "status": "success",
            "course": {
                "id": course.id,
                "name": course.name,
                "academic_year": course.academic_year,
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
        academic_year = data.get("academic_year")

        course = Course.objects.get(id=course_id, supervisor=request.user)
        course.name = name
        course.academic_year = academic_year
        course.save()

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

    # ✅ THIS is the key part: redirect instead of rendering a template
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
            role='intern',
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
    try:
        data = json.loads(request.body)
        student_id = data.get('student_id')
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')

        student = CustomUser.objects.get(student_id=student_id, role='intern')

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
    try:
        data = json.loads(request.body)
        student_id = data.get('student_id')

        # Check if student exists
        student = CustomUser.objects.get(student_id=student_id, role='intern')
        
        # Perform deletion
        student.delete()

        return JsonResponse({'success': True})
    except CustomUser.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Student with ID not found or invalid role.'})
    except Exception as e:
        # Log the error for better debugging
        logger.error(f"Error while deleting student: {str(e)}")
        return JsonResponse({'success': False, 'error': f'An unexpected error occurred: {str(e)}'})
    
@login_required
def view_intern_attendance(request, intern_id):
    intern = get_object_or_404(CustomUser, id=intern_id, role='intern')

     # 🔧 Get the course_id from CourseStudent relation
    course_student = CourseStudent.objects.filter(student=intern).first()
    course_id = course_student.course.id if course_student else None

    # Filter by selected month
    month = request.GET.get('month')
    if month:
        year, month_num = map(int, month.split('-'))
        attendance_records = Attendance.objects.filter(
            intern=intern,
            date__year=year,
            date__month=month_num
        ).order_by('-date')
    else:
        attendance_records = Attendance.objects.filter(intern=intern).order_by('-date')

    present_count = attendance_records.filter(status="Present").count()
    late_count = attendance_records.filter(status="Late").count()
    absent_count = attendance_records.filter(status="Absent").count()
    total = present_count + late_count + absent_count

    # Same weighted logic
    effective_attendance = present_count + (late_count * 0.5)
    attendance_percentage = round((effective_attendance / total) * 100, 2) if total > 0 else 100.0

    today = localdate()
    today_attendance = Attendance.objects.filter(intern=intern, date=today).first()

    return render(request, 'Supervisor/attendance-view.html', {
        'student': intern,
        'attendance_records': attendance_records,
        'present_count': present_count,
        'late_count': late_count,
        'absent_count': absent_count,
        'attendance_percentage': attendance_percentage,
        'current_month': month or timezone.now().strftime('%Y-%m'),
        'today_attendance': today_attendance,
    })



# ---------- INTERN VIEWS ----------

@login_required
def intern_change_password(request):
    if request.method == 'POST':
        new_password = request.POST.get('new_password')
        confirm_password = request.POST.get('confirm_password')

        if new_password != confirm_password:
            messages.error(request, "Passwords do not match.")
            return redirect('intern_change_password')

        user = request.user
        user.set_password(new_password)
        print("Password after set_password (before save):", user.password)  # Should be long and start with "pbkdf2_sha256$"
        user.must_change_password = False
        user.save()
        print("Password after save:", user.password)


        logout(request)
        messages.success(request, "Password changed successfully. Please log in again.")
        return redirect('intern_login')

    return render(request, 'Intern/intern-change-password.html')



def intern_logout(request):
    logout(request)
    return redirect('intern_login')



@login_required
def intern_dashboard(request):
    intern = request.user

    # Get month filter from GET
    month = request.GET.get('month')
    today = now().date()

    # Today's attendance
    today_attendance = Attendance.objects.filter(intern=intern, date=today).first()

    # Monthly records
    if month:
        year, month = map(int, month.split('-'))
        attendance_records = Attendance.objects.filter(
            intern=intern,
            date__year=year,
            date__month=month
        )
    else:
        attendance_records = Attendance.objects.filter(intern=intern)

    total_present = attendance_records.filter(status='Present').count()
    total_late = attendance_records.filter(status='Late').count()
    total_absent = attendance_records.filter(status='Absent').count()
    total = total_present + total_late + total_absent

    # Use weighted attendance formula: Present = 1.0, Late = 0.5
    effective_attendance = total_present + (total_late * 0.5)

    attendance_percentage = round((effective_attendance / total) * 100, 2) if total > 0 else 100.0


    context = {
        "status": today_attendance.status if today_attendance else "Not timed in",
        "today_attendance": today_attendance,
        "present_count": total_present,
        "late_count": total_late,
        "absent_count": total_absent,
        "attendance_percentage": attendance_percentage,
        "attendance_records": attendance_records.order_by('-date'),
        "current_month": request.GET.get('month', now().strftime("%Y-%m")),
        "has_timed_in": bool(today_attendance and today_attendance.time_in),
        "has_timed_out": bool(today_attendance and today_attendance.time_out),
    }

    return render(request, 'Intern/intern-dashboard.html', context)

@login_required
def intern_time_in(request):
    intern = request.user
    now = timezone.localtime(timezone.now())  # Ensure local timezone (Asia/Manila)
    today = now.date()

    # Check if already timed in
    attendance, created = Attendance.objects.get_or_create(intern=intern, date=today)

    if attendance.time_in is None:
        current_time = now.time()

        # Define late
        late_time = datetime.strptime("08:05", "%H:%M").time()

        # Set time in and status
        attendance.time_in = current_time
        attendance.status = "Late" if current_time > late_time else "Present"
        attendance.save()

    return redirect('intern_dashboard')

@login_required
def intern_time_out(request):
    intern = request.user
    now = timezone.localtime(timezone.now())  # Use local time
    today = now.date()

    try:
        attendance = Attendance.objects.get(intern=intern, date=today)

        if attendance.time_out is None:
            attendance.time_out = now.time()
            attendance.save()

    except Attendance.DoesNotExist:
        pass  # Do nothing if not timed in yet

    return redirect('intern_dashboard')

@login_required
def intern_profile_settings(request):
    course_student = CourseStudent.objects.filter(student=request.user).first()
    return render(request, 'Intern/intern-profile-settings.html', {
        'course_student': course_student,
    })
