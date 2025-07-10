from django.urls import path
from . import views
from .views import intern_change_password

urlpatterns = [
    path('', views.home, name='home'),
    path('about/', views.about, name='about'),
    path('supervisor/login/', views.supervisor_login, name='supervisor_login'),
    path('supervisor/register/', views.supervisor_register, name='supervisor_register'),
    path('supervisor/logout/', views.supervisor_logout, name='supervisor_logout'),
    path('intern/login/', views.intern_login, name='intern_login'),
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
    path('supervisor/interns/<int:intern_id>/attendance/', views.view_intern_attendance, name='view_intern_attendance'),
    #intern
    path('intern/change-password/', intern_change_password, name='intern_change_password'),
    path('intern/logout/', views.intern_logout, name='intern_logout'),
    path('intern/dashboard/', views.intern_dashboard, name='intern_dashboard'),
    path('intern/time-in/', views.intern_time_in, name='intern_time_in'),
    path('intern/time-out/', views.intern_time_out, name='intern_time_out'),
    path('intern/profile-settings/', views.intern_profile_settings, name='intern_profile_settings'),
]
