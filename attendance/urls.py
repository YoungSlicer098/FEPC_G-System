from django.urls import path
from . import views
from .views import student_change_password

urlpatterns = [
    path('', views.home, name='home'),
    path('about/', views.about, name='about'),
    path('supervisor/login/', views.supervisor_login, name='supervisor_login'),
    path('supervisor/register/', views.supervisor_register, name='supervisor_register'),
    path('supervisor/logout/', views.supervisor_logout, name='supervisor_logout'),
    path('student/login/', views.student_login, name='student_login'),
    #supervisor
    path('supervisor/dashboard/', views.supervisor_dashboard, name='supervisor_dashboard'),
    path('supervisor/create-course/', views.create_course, name='create_course'),
    path('supervisor/delete-course/', views.delete_course, name='delete_course'),
    path('update-course/<int:course_id>/', views.update_course, name='update_course'),
    path('supervisor/profile/', views.supervisor_profile, name='supervisor_profile'),
    path('change-password/', views.change_password, name='change_password'),
    path('supervisor/view-students/<int:course_id>/', views.view_students, name='view_students'),
    path('add-student/', views.add_student, name='add_student'),
    path('edit-student/', views.edit_student, name='edit_student'),
    path('delete-student/', views.delete_student, name='delete_student'),
    path('supervisor/students/<int:student_id>/attendance/', views.view_student_attendance, name='view_student_attendance'),
    # Academic Year CRUD
    path('supervisor/academic-years/', views.academic_year_list, name='academic_year_list'),
    path('supervisor/academic-year/create/', views.academic_year_create, name='academic_year_create'),
    path('supervisor/academic-year/<int:pk>/update/', views.academic_year_update, name='academic_year_update'),
    path('supervisor/academic-year/<int:pk>/delete/', views.academic_year_delete, name='academic_year_delete'),
    # Semester CRUD
    path('supervisor/semesters/', views.semester_list, name='semester_list'),
    path('supervisor/semester/create/', views.semester_create, name='semester_create'),
    path('supervisor/semester/<int:pk>/update/', views.semester_update, name='semester_update'),
    path('supervisor/semester/<int:pk>/delete/', views.semester_delete, name='semester_delete'),
    #student
    path('student/change-password/', student_change_password, name='student_change_password'),
    path('student/logout/', views.student_logout, name='student_logout'),
    path('student/dashboard/', views.student_dashboard, name='student_dashboard'),
    path('student/time-in/', views.student_time_in, name='student_time_in'),
    path('student/time-out/', views.student_time_out, name='student_time_out'),
    path('student/profile-settings/', views.student_profile_settings, name='student_profile_settings'),
    path('supervisor/students/', views.student_masterlist, name='student_masterlist'),
    path('supervisor/students/add/', views.add_student_masterlist, name='add_student_masterlist'),
    path('supervisor/students/<int:lrn>/edit/', views.edit_student_masterlist, name='edit_student_masterlist'),
    path('supervisor/students/<int:lrn>/delete/', views.delete_student_masterlist, name='delete_student_masterlist'),
]
