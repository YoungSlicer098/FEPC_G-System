# from django.test import TestCase, Client
# from django.urls import reverse
# from django.contrib.auth import get_user_model
# from django.contrib.messages import get_messages
# from django.contrib.staticfiles.testing import StaticLiveServerTestCase
# from selenium import webdriver
# from selenium.webdriver.common.by import By
# from selenium.webdriver.common.keys import Keys
# import time


# class SupervisorLoginTests(TestCase):
#     def setUp(self):
#         self.client = Client()
#         self.login_url = reverse('supervisor_login')

#         User = get_user_model()
#         self.user = User.objects.create_user(
#             email='supervisor@gmail.com',
#             password='password123'
#         )
#         self.user.role = 'supervisor'  
#         self.user.save()

#     def test_supervisor_successful_login(self):
#         response = self.client.post(self.login_url, {
#             'email': 'supervisor@gmail.com',
#             'password': 'password123'
#         })
#         self.assertRedirects(response, reverse('supervisor_dashboard'))

#     def test_invalid_user_login(self):
#         response = self.client.post(self.login_url, {
#             'email': 'wrong@gmail.com',
#             'password': 'wrongpass'
#         })
#         messages = list(get_messages(response.wsgi_request))
#         self.assertIn('Invalid credentials', str(messages[0]))
#         self.assertEqual(response.status_code, 200)

# User = get_user_model()

# class SupervisorLoginIntegrationTests(TestCase):
#     def setUp(self):
#         self.client = Client()
#         self.login_url = reverse('supervisor_login')
#         self.supervisor_email = 'supervisor@example.com'
#         self.supervisor_password = 'password123'
#         self.supervisor_user = User.objects.create_user(
#             email=self.supervisor_email,
#             password=self.supervisor_password,
#             role='supervisor'
#         )
#         self.employee_user = User.objects.create_user(
#             email='employee@example.com',
#             password='password123',
#             role='employee'
#         )

#     def test_successful_supervisor_login(self):
#         response = self.client.post(self.login_url, {
#             'email': self.supervisor_email,
#             'password': self.supervisor_password,
#         })
#         self.assertEqual(response.status_code, 302)
#         self.assertEqual(response.url, reverse('supervisor_dashboard'))

#     def test_invalid_credentials(self):
#         response = self.client.post(self.login_url, {
#             'email': self.supervisor_email,
#             'password': 'wrongpassword',
#         })
#         self.assertEqual(response.status_code, 200)
#         self.assertContains(response, 'Invalid credentials or not a supervisor.')

#     def test_non_supervisor_user_cannot_login(self):
#         response = self.client.post(self.login_url, {
#             'email': self.employee_user.email,
#             'password': 'password123',
#         })
#         self.assertEqual(response.status_code, 200)
#         self.assertContains(response, 'Invalid credentials or not a supervisor.')

#     def test_get_request_renders_login_page(self):
#         response = self.client.get(self.login_url)
#         self.assertEqual(response.status_code, 200)
#         self.assertTemplateUsed(response, 'Home/supervisor-login.html')

#     def test_login_page_contains_email_field_after_failed_login(self):
#         response = self.client.post(self.login_url, {
#             'email': self.supervisor_email,
#             'password': 'wrongpassword',
#         })
#         self.assertContains(response, self.supervisor_email)

#     # Example of a simple security test (access control)
#     def test_supervisor_dashboard_requires_login(self):
#         dashboard_url = reverse('supervisor_dashboard')
#         response = self.client.get(dashboard_url)
#         self.assertEqual(response.status_code, 302)  # Should redirect to login page

# class SupervisorLoginE2ETest(StaticLiveServerTestCase):
#     def setUp(self):
#         self.driver = webdriver.Chrome()
#         self.supervisor = User.objects.create_user(
#             email='sup@example.com', password='pass1234', role='supervisor'
#         )

#     def tearDown(self):
#         self.driver.quit()

#     def test_supervisor_login_flow(self):
#         self.driver.get(f'{self.live_server_url}{reverse("supervisor_login")}')
#         time.sleep(1)

#         email_input = self.driver.find_element(By.NAME, "email")
#         password_input = self.driver.find_element(By.NAME, "password")

#         email_input.send_keys('sup@example.com')
#         password_input.send_keys('pass1234')
#         password_input.send_keys(Keys.RETURN)

#         time.sleep(1)  
#         self.assertIn('dashboard', self.driver.current_url)

#     def test_supervisor_acceptance_login_flow(client, django_user_model):
#         django_user_model.objects.create_user(
#             email="real.sup@example.com", password="strongpass", role="supervisor"
#         )
        
#         response = client.post("/supervisor-login/", {
#             "email": "real.sup@example.com",
#             "password": "strongpass"
#         })
        
#         assert response.status_code == 302
#         assert response.url == "/supervisor_dashboard/"

#     def test_login_still_works_after_update(client, django_user_model):
#         django_user_model.objects.create_user(email="check.sup@example.com", password="pass123", role="supervisor")
#         response = client.post("/supervisor-login/", {
#             "email": "check.sup@example.com",
#             "password": "pass123"
#         })
#         assert response.status_code == 302
#         assert response.url == "/supervisor_dashboard/"

#     def test_control_flow_for_invalid_user(client, django_user_model):
#         response = client.post("/supervisor-login/", {
#             "email": "ghost@none.com",
#             "password": "nope"
#         })
#         assert b"Invalid credentials" in response.content



    
