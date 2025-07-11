from django.db import migrations

def create_academic_years_and_update_courses(apps, schema_editor):
    Course = apps.get_model('attendance', 'Course')
    AcademicYear = apps.get_model('attendance', 'AcademicYear')
    Semester = apps.get_model('attendance', 'Semester')
    
    # Create default semesters if they don't exist
    if not Semester.objects.exists():
        Semester.objects.create(name="1st Sem")
        Semester.objects.create(name="2nd Sem")
    
    # Get all unique academic years from the temporary field
    existing_years = Course.objects.values_list('academic_year_temp', flat=True).distinct()
    
    # Create AcademicYear records and update courses
    for year_string in existing_years:
        if year_string:  # Skip empty values
            # Create AcademicYear if it doesn't exist
            academic_year, created = AcademicYear.objects.get_or_create(name=year_string)
            
            # Update all courses with this academic year string
            Course.objects.filter(academic_year_temp=year_string).update(
                academic_year_id=academic_year.id,
                semester_id=Semester.objects.first().id  # Assign to first semester as default
            )

def reverse_migration(apps, schema_editor):
    # This is the reverse operation if needed
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('attendance', '0008_academicyear_semester_subject_alter_course_options_and_more'),
    ]

    operations = [
        migrations.RunPython(create_academic_years_and_update_courses, reverse_migration),
    ] 