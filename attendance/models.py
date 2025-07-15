from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.base_user import BaseUserManager
from django.conf import settings
from django.utils import timezone

class CustomUserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email must be set")
        email = self.normalize_email(email)
        extra_fields.setdefault('role', 'student')
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', 'supervisor')
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        return self.create_user(email, password, **extra_fields)

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('supervisor', 'Supervisor'),
        ('student', 'Student'),
    )
    username = None  # <--- THIS REMOVES THE USERNAME FIELD
    email = models.EmailField(_('email address'), unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    student_id = models.CharField(max_length=20, unique=True, null=True, blank=True)  # Student ID field
    
    must_change_password = models.BooleanField(default=True)


    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    def __str__(self):
        return self.email

# Academic Year Management
class AcademicYear(models.Model):
    name = models.CharField(max_length=20, unique=True)  # e.g., "2024-2025"
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-name']

# Semester Management
class Semester(models.Model):
    SEMESTER_CHOICES = (
        ('1st Sem', '1st Semester'),
        ('2nd Sem', '2nd Semester'),
    )
    name = models.CharField(max_length=10, choices=SEMESTER_CHOICES, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']

# Subject Management
class Subject(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.code} - {self.name}" if self.code else self.name

    class Meta:
        ordering = ['name']

#supervisor

class Course(models.Model):
    name = models.CharField(max_length=100)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='courses')
    semester = models.ForeignKey(Semester, on_delete=models.CASCADE, related_name='courses')
    course_code = models.CharField(max_length=20, blank=True, null=True)
    # Use settings.AUTH_USER_MODEL to avoid direct import of CustomUser
    supervisor = models.ForeignKey('CustomUser', on_delete=models.CASCADE, related_name='courses')
    default_subjects = models.ManyToManyField(Subject, blank=True, related_name='courses')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.academic_year.name} - {self.semester.name})"
    
    class Meta:
        unique_together = ('name', 'academic_year', 'semester', 'supervisor')
        ordering = ['-created_at']
    
class CourseStudent(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='students')
    student = models.ForeignKey(CustomUser, on_delete=models.CASCADE, limit_choices_to={'role': 'student'})
    date_added = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.email} in {self.course.name}"

    
class Meta:
    unique_together = ('name', 'academic_year', 'supervisor')

#student

class Attendance(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'student'}
    )
    date = models.DateField(default=timezone.now)
    time_in = models.TimeField(null=True, blank=True)
    time_out = models.TimeField(null=True, blank=True)
    location_in = models.CharField(max_length=255, blank=True)
    location_out = models.CharField(max_length=255, blank=True)
    
    STATUS_CHOICES = (
        ('Present', 'Present'),
        ('Late', 'Late'),
        ('Absent', 'Absent'),
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Absent')

    class Meta:
        unique_together = ('student', 'date')  # Prevent duplicate entries per day

    def __str__(self):
        return f"{self.student.email} - {self.date} ({self.status})"

class StudentMasterlist(models.Model):
    lrn = models.CharField(max_length=12, unique=True, primary_key=True)
    first_name = models.CharField(max_length=50)
    middle_initial = models.CharField(max_length=1, blank=True, null=True)
    last_name = models.CharField(max_length=50)
    email = models.EmailField(unique=True)
    gender = models.CharField(max_length=10, choices=[('male', 'Male'), ('female', 'Female')])
    date_of_birth = models.DateField()
    password = models.CharField(max_length=128, blank=True, null=True)  # Store initial password for reference
    user = models.OneToOneField(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Auto-fill password with capitalized last name if not set
        if not self.password and self.last_name:
            self.password = self.last_name.capitalize()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.lrn} - {self.last_name}, {self.first_name}"

class StudentAuditLog(models.Model):
    ACTION_CHOICES = (
        ('add', 'Add'),
        ('edit', 'Edit'),
        ('delete', 'Delete'),
    )
    supervisor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, limit_choices_to={'role': 'supervisor'})
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    student_lrn = models.CharField(max_length=20)
    student_name = models.CharField(max_length=100)
    details = models.TextField(blank=True)  # JSON or text summary of changes
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_action_display()} by {self.supervisor} on {self.student_lrn} at {self.timestamp}"