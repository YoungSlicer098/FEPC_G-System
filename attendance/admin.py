from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Course, CourseStudent, AcademicYear, Semester, Subject, StudentAuditLog

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['email', 'first_name', 'last_name', 'role', 'student_id', 'is_staff', 'is_active']
    list_filter = ['role', 'is_staff', 'is_active', 'gender', 'must_change_password']
    search_fields = ('email', 'first_name', 'last_name', 'student_id')
    ordering = ('email',)
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'middle_initial', 'gender', 'date_of_birth', 'student_id', 'role')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions', 'must_change_password')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'middle_initial', 'gender', 'date_of_birth', 'student_id', 'role', 'password1', 'password2'),
        }),
    )

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ['name', 'course_code', 'academic_year', 'semester', 'supervisor']
    list_filter = ['academic_year', 'semester', 'supervisor']
    search_fields = ['name', 'course_code']
    filter_horizontal = ['default_subjects']

@admin.register(CourseStudent)
class CourseStudentAdmin(admin.ModelAdmin):
    list_display = ['student', 'course', 'date_added']
    list_filter = ['course', 'date_added']
    search_fields = ['student__email', 'student__first_name', 'student__last_name', 'course__name']

@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']

@admin.register(Semester)
class SemesterAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'code']

@admin.register(StudentAuditLog)
class StudentAuditLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'student_id', 'student_name', 'supervisor', 'timestamp']
    list_filter = ['action', 'timestamp', 'supervisor']
    search_fields = ['student_id', 'student_name', 'details']
    readonly_fields = ['timestamp']

admin.site.register(CustomUser, CustomUserAdmin)
