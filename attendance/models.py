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
        extra_fields.setdefault('role', 'intern')
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
        ('intern', 'Intern'),
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
    
#supervisor

class Course(models.Model):
    name = models.CharField(max_length=100)
    academic_year = models.CharField(max_length=20)
    course_code = models.CharField(max_length=20, blank=True, null=True)
    # Use settings.AUTH_USER_MODEL to avoid direct import of CustomUser
    supervisor = models.ForeignKey('CustomUser', on_delete=models.CASCADE, related_name='courses')

    def __str__(self):
        return f"{self.name} ({self.academic_year})"
    
class CourseStudent(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='students')
    student = models.ForeignKey(CustomUser, on_delete=models.CASCADE, limit_choices_to={'role': 'intern'})
    date_added = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.email} in {self.course.name}"

    
class Meta:
    unique_together = ('name', 'academic_year', 'supervisor')

#intern

class Attendance(models.Model):
    intern = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'intern'}
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
        unique_together = ('intern', 'date')  # Prevent duplicate entries per day

    def __str__(self):
        return f"{self.intern.email} - {self.date} ({self.status})"