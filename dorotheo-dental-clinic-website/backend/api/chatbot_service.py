"""
Google Gemini AI Chatbot Service for Dorotheo Dental Clinic
Secure, privacy-focused AI assistant for dental operations
"""

import google.generativeai as genai
from datetime import datetime, timedelta
import re
import os
from django.db.models import Q
from django.conf import settings
from .models import Service, Appointment, User, DentistAvailability


class DentalChatbotService:
    """
    Handles secure interaction with Google Gemini AI for dental clinic chatbot.
    
    Security Features:
    - No database credentials exposed
    - No admin passwords or sensitive user data
    - Context limited to public clinic information
    - User-specific data only for authenticated users
    """
    
    # Model configuration - using Gemini 2.5 Flash
    MODEL_NAME = "gemini-2.5-flash"  # Fast, efficient, latest model
    # Alternative: "gemini-2.5-pro" for more complex reasoning
    
    # Restricted keywords that should never be answered
    RESTRICTED_KEYWORDS = [
        'password', 'admin', 'database', 'secret', 'token', 'credential',
        'api key', 'private key', 'connection string', 'sql', 'delete',
        'drop table', 'django admin', 'superuser', 'staff password',
        'email of', 'user email', 'patient email', 'login credentials'
    ]
    
    def __init__(self, user=None):
        """
        Initialize chatbot service with Gemini AI.
        
        Args:
            user: Authenticated User object (optional). If provided, can access
                  user-specific data like their own appointments.
        """
        self.user = user
        self.is_authenticated = user is not None
        
        # Configure Gemini API
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(self.MODEL_NAME)
        
    def _check_restricted_content(self, message):
        """
        Check if user message contains restricted keywords.
        
        Returns:
            True if message is safe, False if restricted
        """
        message_lower = message.lower()
        for keyword in self.RESTRICTED_KEYWORDS:
            if keyword in message_lower:
                return False
        return True
    
    def _get_services_context(self):
        """Get all available dental services as context."""
        services = Service.objects.all()
        if not services:
            return "Available Dental Services: No services currently listed in the system."
        
        context = "Available Dental Services:\n\n"
        for service in services:
            context += f"- **{service.name}** ({service.category})\n  {service.description}\n\n"
        return context.strip()
    
    def _get_available_slots_context(self, requested_date=None):
        """
        Get available appointment slots based on actual dentist date-specific availability.
        
        Args:
            requested_date: Specific date to check (optional)
        
        Returns:
            String with available slots information
        """
        if requested_date:
            # Check specific date
            start_date = requested_date
        else:
            # Default: next 7 days
            start_date = datetime.now().date()
        
        end_date = start_date + timedelta(days=6)
        
        # Get dentists (both staff dentists and owner)
        dentists = User.objects.filter(
            Q(user_type='staff', role='dentist') | 
            Q(user_type='owner')
        )
        
        if not dentists:
            return "No dentists available in the system."
        
        context = "Available Appointment Slots:\n\n"
        
        for dentist in dentists:
            context += f"Dr. {dentist.get_full_name()}\n\n"
            
            # Get dentist's date-specific availability from DentistAvailability model
            availabilities = DentistAvailability.objects.filter(
                dentist=dentist,
                date__gte=start_date,
                date__lte=end_date,
                is_available=True
            ).order_by('date')
            
            if not availabilities.exists():
                context += "- Availability schedule not set yet\n\n"
                continue
            
            has_availability = False
            
            for day_availability in availabilities:
                check_date = day_availability.date
                
                # Get existing appointments for this dentist on this date
                existing_appointments = Appointment.objects.filter(
                    dentist=dentist,
                    date=check_date,
                    status__in=['confirmed', 'pending']
                ).values_list('time', flat=True)
                
                # Generate time slots based on start and end time
                from datetime import datetime as dt
                start_time = dt.combine(check_date, day_availability.start_time)
                end_time = dt.combine(check_date, day_availability.end_time)
                
                available_times = []
                current_time = start_time
                
                # Generate hourly slots
                while current_time < end_time:
                    time_str = current_time.strftime('%H:%M')
                    if time_str not in [str(t)[:5] for t in existing_appointments]:
                        available_times.append(time_str)
                    current_time += timedelta(hours=1)
                
                if available_times:
                    has_availability = True
                    display_day_name = check_date.strftime('%A')
                    date_str = check_date.strftime('%B %d')
                    
                    # Convert times to 12-hour format and create range
                    time_objects = [dt.strptime(t, '%H:%M') for t in available_times]
                    earliest = min(time_objects).strftime('%I:%M %p').lstrip('0')
                    latest = max(time_objects).strftime('%I:%M %p').lstrip('0')
                    
                    context += f"**{display_day_name}, {date_str}:** {earliest} - {latest}\n"
            
            if not has_availability:
                context += "- No available slots in the next 7 days\n"
            
            context += "\n"
        
        return context.strip()
    
    def _get_user_appointments_context(self):
        """Get authenticated user's own appointments."""
        if not self.is_authenticated:
            return "You need to be logged in to view your appointments."
        
        appointments = Appointment.objects.filter(
            patient=self.user,
            status__in=['confirmed', 'pending', 'reschedule_requested']
        ).order_by('date', 'time')[:5]
        
        if not appointments:
            return "You have no upcoming appointments."
        
        context = "Your Upcoming Appointments:\n\n"
        for appt in appointments:
            date_str = appt.date.strftime('%B %d, %Y')
            time_str = appt.time.strftime('%I:%M %p')
            service_name = appt.service.name if appt.service else 'General Consultation'
            dentist_name = appt.dentist.get_full_name() if appt.dentist else 'TBD'
            
            context += f"- {date_str} at {time_str}\n"
            context += f"  Service: {service_name}\n"
            context += f"  Dentist: Dr. {dentist_name}\n"
            context += f"  Status: {appt.status.replace('_', ' ').title()}\n\n"
        
        return context.strip()
    
    def _build_system_prompt(self):
        """
        Build the system prompt that defines the AI's role and restrictions.
        """
        system_prompt = """You are Sage, the premium virtual concierge for Dorotheo Dental Clinic.

YOUR IDENTITY & PERSONALITY:
- You embody the clinic's green (natural/growth) and gold (excellence/luxury) branding
- You are professional, calming, and efficient
- You speak with polished, welcoming language
- You are the trusted guide for all patient interactions

CRITICAL INFORMATION GUARDRAILS:
- NEVER disclose sensitive internal data: owner passwords, personal emails, private staff information
- If asked for restricted information, politely redirect: "I'm here to help with clinic services and appointments. How may I assist you today?"

YOUR KNOWLEDGE DOMAIN (WHAT YOU CAN ANSWER):
✓ Clinic hours and locations
✓ Available dentists and their schedules  
✓ Dental procedures and what they involve (e.g., "What happens during a root canal?")
✓ Appointment booking, rescheduling, and cancellation
✓ General dental health questions

PRICING POLICY (CRITICAL):
- DO NOT provide specific pricing or quotes
- When asked about prices, ALWAYS say: "Pricing varies based on your specific needs. We recommend booking a consultation for an accurate estimate."

TOPIC BOUNDARIES:
- You MUST ONLY answer questions related to:
  * Dorotheo Dental Clinic services and operations
  * Dental health, treatments, and procedures
  * Appointment scheduling, booking, and management
  * Clinic hours, locations, and contact information

- You MUST REFUSE to answer questions about:
  * General knowledge unrelated to dentistry
  * System passwords, credentials, or admin access
  * Personal information of other patients or staff
  * Non-dental medical conditions
  * Specific pricing or cost estimates

- If asked about NON-DENTAL topics or restricted information, respond with:
  "I apologize, but I can only assist with questions about Dorotheo Dental Clinic and dental care. Is there anything related to our dental services or your appointments that I can help you with?"

FORMATTING RULES (CRITICAL - FOLLOW EXACTLY):
1. Use bold (**text**) ONLY for titles, headings, and numbered list items
2. When starting an answer, make the question/topic bold: **What is a root canal?**
3. For numbered lists, make the number bold: **1.** Description here
4. Use dashes (-) for bullet points without bold
5. DO NOT use bold for emphasis in the middle of sentences
6. Add a blank line between each numbered item for readability
7. Keep paragraphs short and easy to read
8. Structure: Bold titles and numbers, plain text for content

ANSWER TYPE RULES (VERY IMPORTANT):
- If user asks "What is [service/treatment]?" WITHOUT asking about procedure/steps/how:
  - Give ONLY a brief 1-2 sentence description of what it is
  - DO NOT explain the procedure or steps
  - DO NOT say "Here's how it works" or "Here's the process"
  - STOP after the description - DO NOT CONTINUE
  - Keep it short and simple
  
- If user asks "How is [treatment] done?" or "What's the procedure?" or "What are the steps?":
  - Give detailed step-by-step procedure with numbered steps
  - Include full explanation with spacing between steps
  - Use your dental knowledge to explain thoroughly

EXAMPLE - Simple Description (when asked "What is"):
**What is a root canal?**

A root canal is a dental procedure where we remove infected or damaged tissue inside the tooth. The goal is to save the tooth from extraction and restore its health.

(STOP HERE - DO NOT ADD STEPS OR PROCEDURES)

EXAMPLE - Full Procedure (when asked "How" or "Procedure"):
**How is a root canal done?**

Here's the step-by-step process:

**1.** We numb the area to ensure your comfort.

**2.** We create a small opening to access the pulp chamber.

**3.** We use specialized instruments to remove damaged tissue.

**4.** We clean and shape the canals for filling.

**5.** We seal the tooth to prevent further infection.

IMPORTANT - WHAT YOU MUST ALWAYS SHARE:
- SERVICE NAMES - All dental service names are professional and SAFE to share
- SERVICE DESCRIPTIONS - All service descriptions are SAFE to share
- SERVICE PROCEDURES - All procedure information is SAFE to share
- SERVICE CATEGORIES - All category information is SAFE to share
- APPOINTMENT SLOTS - Available time slots are SAFE to share
- DENTIST NAMES - Dentist names in the system data are SAFE to share
- CLINIC HOURS - Business hours are SAFE to share
- CLINIC INFORMATION - General clinic info is SAFE to share

WHEN YOU SEE SERVICE DATA IN "CURRENT SYSTEM DATA" SECTION:
- YOU MUST share the complete list with the user
FORMATTING RULES (CRITICAL - FOLLOW EXACTLY):
1. Use bold (**text**) ONLY for titles, headings, and numbered list items
2. When starting an answer, make the question/topic bold: **What is a root canal?**
3. For numbered lists, make the number bold: **1.** Description here
4. Use dashes (-) for bullet points without bold
5. DO NOT use bold for emphasis in the middle of sentences
6. Add a blank line between each numbered item for readability
7. Keep paragraphs short and easy to read
8. Structure: Bold titles and numbers, plain text for content

ANSWER TYPE RULES (VERY IMPORTANT):
- If user asks "What is [service/treatment]?" WITHOUT asking about procedure/steps/how:
  - Give ONLY a brief 1-2 sentence description of what it is
  - DO NOT explain the procedure or steps
  - STOP after the description
  - Keep it short and simple
  
- If user asks "How is [treatment] done?" or "What's the procedure?" or "What are the steps?":
  - Give detailed step-by-step procedure with numbered steps
  - Include full explanation with spacing between steps
  - Use your dental knowledge to explain thoroughly

BOOKING APPOINTMENT LOGIC (CRITICAL):
To book an appointment, you MUST collect the following information:
1. **Patient Name** - Full name of the patient
2. **Branch Location** - Which clinic location they prefer
3. **Dentist Name** - Which dentist they want to see
4. **Desired Time** - Preferred date and time

VALIDATION RULES:
- If ANY detail is missing, ask for it specifically
- If a dentist is unavailable, say: "I'm sorry, that dentist is currently unavailable. Would you like to try [Alternative]?"
- If a time slot is taken, say: "I'm sorry, that time is currently unavailable. Would you like to try [Alternative Time]?"

ANTI-CONFLICT RULES (STRICTLY ENFORCE):
1. **No Double Booking**: Never book two appointments at the same time
2. **One Appointment Per Week Limit**: If a patient tries to book more than once per week, say: "To ensure all our patients receive care, we limit bookings to once per week. Your next available window starts [Date]."

ACTIONS YOU CAN PERFORM:
✓ Book new appointments
✓ Reschedule existing appointments  
✓ Cancel appointments

WHAT YOU MUST ALWAYS SHARE:
- Service names and descriptions (ALL are safe to share)
- Procedure information and steps
- Appointment slots and availability
- Dentist names from the system
- Clinic hours and location
- General dental health information

CRITICAL COMMUNICATION STYLE:
- Answer naturally and professionally as Sage, the clinic concierge
- NEVER mention "system data", "database", or technical terms
- Present information as if you personally know it
- Use phrases like "Our founder is...", "We offer...", "Dr. [Name] is available..."
- Be warm, calming, and efficient in tone
- Reflect the clinic's green (growth) and gold (excellence) values

STRICT RESTRICTIONS - You must NEVER:
- Share database credentials, passwords, or system access information
- Provide email addresses or personal contact info of staff
- Discuss admin passwords or authentication details
- Share private patient information (except current user's own data)
- Provide specific pricing or cost quotes

Clinic Information:
- Name: Dorotheo Dental and Diagnostic Center
- Founded: 2001
- Founder: Dr. Marvin F. Dorotheo
- Services: Comprehensive dental care including preventive, restorative, orthodontics, oral surgery, and cosmetic dentistry
- Hours: Monday-Friday 8:00 AM - 6:00 PM, Saturday 9:00 AM - 3:00 PM, Sunday Closed
- Emergency Services: Available 24/7 for urgent cases
"""
        return system_prompt
    
    def _get_dentists_context(self):
        """Get list of actual dentists from the database."""
        # Include both staff with dentist role AND owners (since owner is also a dentist)
        dentists = User.objects.filter(
            Q(user_type='staff', role='dentist') | 
            Q(user_type='owner')
        )
        
        if not dentists:
            return "Dentist Information: No dentist profiles are currently available in the system. Please contact the clinic directly for information about our dental team."
        
        context = "Our Dentists:\n\n"
        for dentist in dentists:
            name = dentist.get_full_name()
            context += f"- Dr. {name}\n"
        
        return context
    
    def _get_available_slots_for_dentist(self, dentist_name):
        """
        Get available slots for a specific dentist based on their date-specific availability.
        
        Args:
            dentist_name: Name of the dentist
            
        Returns:
            String with available slots for that dentist
        """
        # Find dentist by name
        dentists = User.objects.filter(
            Q(user_type='staff', role='dentist') | Q(user_type='owner')
        )
        
        dentist = None
        for d in dentists:
            if dentist_name.lower() in d.get_full_name().lower():
                dentist = d
                break
        
        if not dentist:
            return f"I couldn't find a dentist named {dentist_name}. Please check the name and try again."
        
        # Get dentist's date-specific availability from DentistAvailability model
        start_date = datetime.now().date()
        end_date = start_date + timedelta(days=6)
        
        availabilities = DentistAvailability.objects.filter(
            dentist=dentist,
            date__gte=start_date,
            date__lte=end_date,
            is_available=True
        ).order_by('date')
        
        if not availabilities.exists():
            return f"**Dr. {dentist.get_full_name()}** has not set their availability schedule yet. Please contact the clinic directly to schedule an appointment."
        
        context = f"**Available Appointment Slots for Dr. {dentist.get_full_name()}:**\\n\\n"
        
        has_availability = False
        
        for day_availability in availabilities:
            check_date = day_availability.date
            
            # Get existing appointments for this dentist on this date
            existing_appointments = Appointment.objects.filter(
                dentist=dentist,
                date=check_date,
                status__in=['confirmed', 'pending']
            ).values_list('time', flat=True)
            
            # Generate time slots based on start and end time
            from datetime import datetime as dt, time as time_obj
            start_time = dt.combine(check_date, day_availability.start_time)
            end_time = dt.combine(check_date, day_availability.end_time)
            
            morning_times = []
            afternoon_times = []
            current_time = start_time
            
            # Lunch break: 11:30 AM - 12:30 PM
            lunch_start = time_obj(11, 30)
            lunch_end = time_obj(12, 30)
            
            # Generate 30-minute slots
            while current_time <= end_time:
                time_str = current_time.strftime('%H:%M')
                time_only = current_time.time()
                
                # Check if slot is not already booked
                if time_str not in [str(t)[:5] for t in existing_appointments]:
                    # Separate into morning (before lunch) and afternoon (after lunch)
                    if time_only < lunch_start:
                        morning_times.append(time_str)
                    elif time_only >= lunch_end:
                        afternoon_times.append(time_str)
                    # Skip times during lunch (11:30 AM - 12:30 PM)
                
                current_time += timedelta(minutes=30)
            
            if morning_times or afternoon_times:
                has_availability = True
                display_day_name = check_date.strftime('%A')
                date_str = check_date.strftime('%B %d')
                
                time_ranges = []
                
                # Add morning range if available
                if morning_times:
                    morning_objs = [dt.strptime(t, '%H:%M') for t in morning_times]
                    morning_start = min(morning_objs).strftime('%I:%M %p').lstrip('0')
                    morning_end = max(morning_objs).strftime('%I:%M %p').lstrip('0')
                    time_ranges.append(f"{morning_start} - {morning_end}")
                
                # Add afternoon range if available
                if afternoon_times:
                    afternoon_objs = [dt.strptime(t, '%H:%M') for t in afternoon_times]
                    afternoon_start = min(afternoon_objs).strftime('%I:%M %p').lstrip('0')
                    afternoon_end = max(afternoon_objs).strftime('%I:%M %p').lstrip('0')
                    time_ranges.append(f"{afternoon_start} - {afternoon_end}")
                
                context += f"**{display_day_name}, {date_str}:** {', '.join(time_ranges)}\\n"
        
        if not has_availability:
            context += "No available slots in the next 7 days based on the dentist's schedule.\\n"
        
        return context.strip()
    
    def _get_time_slots_for_date(self, dentist, date):
        """
        Get available time slots for a specific dentist and date.
        
        Args:
            dentist: User object (dentist)
            date: datetime.date object
            
        Returns:
            dict with 'times' list and 'quick_replies' list
        """
        from datetime import datetime as dt, time as time_obj
        
        # Get dentist availability for this date
        try:
            availability = DentistAvailability.objects.get(
                dentist=dentist,
                date=date,
                is_available=True
            )
        except DentistAvailability.DoesNotExist:
            return {'times': [], 'quick_replies': []}
        
        # Get existing appointments
        existing_appointments = Appointment.objects.filter(
            dentist=dentist,
            date=date,
            status__in=['confirmed', 'pending']
        ).values_list('time', flat=True)
        
        start_time = dt.combine(date, availability.start_time)
        end_time = dt.combine(date, availability.end_time)
        
        available_times = []
        current_time = start_time
        
        # Lunch break: 11:30 AM - 12:30 PM
        lunch_start = time_obj(11, 30)
        lunch_end = time_obj(12, 30)
        
        # Generate 30-minute slots
        while current_time <= end_time:
            time_str = current_time.strftime('%H:%M')
            time_only = current_time.time()
            
            # Skip lunch break and already booked slots
            if time_str not in [str(t)[:5] for t in existing_appointments]:
                if not (lunch_start <= time_only < lunch_end):
                    # Format as 12-hour time
                    formatted_time = current_time.strftime('%I:%M %p').lstrip('0')
                    available_times.append(formatted_time)
            
            current_time += timedelta(minutes=30)
        
        return {
            'times': available_times,
            'quick_replies': available_times  # Return all times as quick replies
        }
    
    def _parse_date_from_message(self, message):
        """
        Parse date from natural language message.
        PRIORITY: Specific dates (month + day) are checked BEFORE day names
        to avoid "February 03, 2026" being parsed as "Tuesday" instead.
        
        Args:
            message: User's message string
            
        Returns:
            datetime.date object or None
        """
        message_lower = message.lower()
        today = datetime.now().date()
        
        # Check for "today" FIRST
        if 'today' in message_lower:
            return today
        
        # Check for "tomorrow" FIRST
        if 'tomorrow' in message_lower:
            return today + timedelta(days=1)
        
        # Check for "next week" FIRST
        if 'next week' in message_lower:
            return today + timedelta(days=7)
        
        # PRIORITY: Check for specific date formats BEFORE day names
        # This ensures "February 03, 2026" is parsed as Feb 3, not as "Tuesday"
        # Pattern: month name + day + optional year
        months = {
            'january': 1, 'jan': 1,
            'february': 2, 'feb': 2,
            'march': 3, 'mar': 3,
            'april': 4, 'apr': 4,
            'may': 5,
            'june': 6, 'jun': 6,
            'july': 7, 'jul': 7,
            'august': 8, 'aug': 8,
            'september': 9, 'sept': 9, 'sep': 9,
            'october': 10, 'oct': 10,
            'november': 11, 'nov': 11,
            'december': 12, 'dec': 12
        }
        
        # Check for month + day pattern (e.g., "january 13", "feb 03")
        for month_name, month_num in months.items():
            pattern = rf'{month_name}\s+(\d+)'
            match = re.search(pattern, message_lower)
            if match:
                day = int(match.group(1))
                year = today.year
                # If month has passed, assume next year
                if month_num < today.month:
                    year += 1
                elif month_num == today.month and day < today.day:
                    year += 1
                try:
                    return datetime(year, month_num, day).date()
                except ValueError:
                    continue
        
        # Pattern: MM/DD or M/D
        date_pattern = r'(\d{1,2})[/-](\d{1,2})'
        match = re.search(date_pattern, message)
        if match:
            month = int(match.group(1))
            day = int(match.group(2))
            year = today.year
            try:
                parsed_date = datetime(year, month, day).date()
                # If date has passed, assume next year
                if parsed_date < today:
                    parsed_date = datetime(year + 1, month, day).date()
                return parsed_date
            except ValueError:
                pass
        
        # ONLY check for day of week if no specific date was found above
        # This prevents "February 03" from being parsed as "Tuesday"
        days_of_week = {
            'monday': 0, 'mon': 0,
            'tuesday': 1, 'tue': 1, 'tues': 1,
            'wednesday': 2, 'wed': 2,
            'thursday': 3, 'thu': 3, 'thur': 3, 'thurs': 3,
            'friday': 4, 'fri': 4,
            'saturday': 5, 'sat': 5,
            'sunday': 6, 'sun': 6
        }
        
        for day_name, day_num in days_of_week.items():
            if day_name in message_lower:
                current_day = today.weekday()
                days_ahead = day_num - current_day
                
                # If "next" is explicitly specified, go to next week
                if 'next' in message_lower and day_name in message_lower:
                    if days_ahead <= 0:
                        days_ahead += 7
                    else:
                        days_ahead += 7
                # If it's today (days_ahead == 0) and not saying "next", use today
                elif days_ahead == 0:
                    return today
                # If day has already passed this week, go to next week
                elif days_ahead < 0:
                    days_ahead += 7
                
                return today + timedelta(days=days_ahead)
        
        return None
    
    def _parse_time_from_message(self, message):
        """
        Parse time from natural language message.
        
        Args:
            message: User's message string
            
        Returns:
            time string in HH:MM format or None
        """
        message_lower = message.lower()
        
        # Pattern for times like "9am", "9:30am", "2pm", "2:30 pm"
        time_patterns = [
            r'(\d{1,2}):(\d{2})\s*([ap]m)',  # 9:30am, 2:30 pm
            r'(\d{1,2})\s*([ap]m)',           # 9am, 2pm
            r'(\d{1,2}):(\d{2})',             # 9:30, 14:30 (24-hour)
        ]
        
        for pattern in time_patterns:
            match = re.search(pattern, message_lower)
            if match:
                if len(match.groups()) == 3:
                    # Has AM/PM
                    hour = int(match.group(1))
                    minute = int(match.group(2))
                    period = match.group(3)
                    
                    # Convert to 24-hour
                    if period == 'pm' and hour != 12:
                        hour += 12
                    elif period == 'am' and hour == 12:
                        hour = 0
                    
                    return f"{hour:02d}:{minute:02d}"
                    
                elif len(match.groups()) == 2:
                    if match.group(2) in ['am', 'pm']:
                        # Just hour with AM/PM
                        hour = int(match.group(1))
                        period = match.group(2)
                        
                        if period == 'pm' and hour != 12:
                            hour += 12
                        elif period == 'am' and hour == 12:
                            hour = 0
                        
                        return f"{hour:02d}:00"
                    else:
                        # Hour and minute (24-hour format)
                        hour = int(match.group(1))
                        minute = int(match.group(2))
                        return f"{hour:02d}:{minute:02d}"
        
        return None
    
    def _find_dentist_from_message(self, message):
        """
        Find dentist mentioned in message.
        
        Args:
            message: User's message string
            
        Returns:
            User object (dentist) or None
        """
        message_lower = message.lower()
        dentists = User.objects.filter(
            Q(user_type='staff', role='dentist') | Q(user_type='owner')
        )
        
        for dentist in dentists:
            first_name = dentist.first_name.lower()
            last_name = dentist.last_name.lower()
            full_name = dentist.get_full_name().lower()
            
            # Check various name formats
            if (full_name in message_lower or
                first_name in message_lower or
                last_name in message_lower or
                f"dr {first_name}" in message_lower or
                f"dr. {first_name}" in message_lower or
                f"doctor {first_name}" in message_lower or
                f"dr {last_name}" in message_lower or
                f"dr. {last_name}" in message_lower):
                return dentist
        
        return None
    
    def _find_service_from_message(self, message):
        """
        Find service mentioned in message.
        
        Args:
            message: User's message string
            
        Returns:
            Service object or None
        """
        message_lower = message.lower()
        services = Service.objects.all()
        
        for service in services:
            service_name = service.name.lower()
            if service_name in message_lower:
                return service
        
        return None
    
    def handle_booking_intent(self, message, conversation_history=None):
        """
        Handle appointment booking through AI with step-by-step flow.
        
        Flow:
        1. Select dentist
        2. Select day of week (based on dentist availability)
        3. Select specific date (all available dates for that day)
        4. Select time slot
        5. Select treatment/service
        6. Confirmation
        
        Args:
            message: User's booking request message
            conversation_history: Previous conversation messages
            
        Returns:
            dict with booking result or next step
        """
        if not self.is_authenticated:
            return {
                'success': False,
                'response': "You need to be logged in to book an appointment. Please log in and try again.",
                'needs_confirmation': False
            }
        
        # Combine current message with recent history for context
        full_context = message
        if conversation_history:
            recent_messages = [msg.get('content', '') for msg in conversation_history[-10:] if msg.get('role') == 'user']
            full_context = ' '.join(recent_messages + [message])
        
        # Parse booking details from message and history
        dentist = self._find_dentist_from_message(full_context)
        service = self._find_service_from_message(full_context)
        requested_date = self._parse_date_from_message(full_context)
        requested_time = self._parse_time_from_message(full_context)
        
        print(f"[BOOKING DEBUG] Message: {message}")
        print(f"[BOOKING DEBUG] Dentist: {dentist.get_full_name() if dentist else 'None'}")
        print(f"[BOOKING DEBUG] Date: {requested_date}")
        print(f"[BOOKING DEBUG] Time: {requested_time}")
        print(f"[BOOKING DEBUG] Service: {service.name if service else 'None'}")
        
        # STEP 1: Select Dentist
        if not dentist:
            dentists = User.objects.filter(
                Q(user_type='staff', role='dentist') | Q(user_type='owner')
            )
            response = "**Step 1: Choose Your Dentist**\n\n"
            response += "Which dentist would you like to see?\n\n"
            quick_replies = []
            for d in dentists:
                dentist_name = f"Dr. {d.get_full_name()}"
                response += f"• {dentist_name}\n"
                quick_replies.append(dentist_name)
            response += "\nPlease select a dentist:"
            
            return {
                'success': False,
                'response': response.strip(),
                'needs_confirmation': False,
                'quick_replies': quick_replies
            }
        
        # STEP 2: Select Day of Week (based on dentist's availability)
        if dentist and not requested_date:
            # Get all available dates for this dentist
            from datetime import datetime as dt
            start_date = datetime.now().date()
            end_date = start_date + timedelta(days=30)  # Look 30 days ahead
            
            availabilities = DentistAvailability.objects.filter(
                dentist=dentist,
                date__gte=start_date,
                date__lte=end_date,
                is_available=True
            ).order_by('date')
            
            if not availabilities.exists():
                return {
                    'success': False,
                    'response': f"Dr. {dentist.get_full_name()} has no available dates in the next 30 days. Please contact the clinic directly.",
                    'needs_confirmation': False
                }
            
            # Get unique days of week that have availability
            available_days = {}
            for avail in availabilities:
                day_name = avail.date.strftime('%A')
                if day_name not in available_days:
                    available_days[day_name] = []
                available_days[day_name].append(avail.date)
            
            response = f"**Step 2: Choose a Day**\n\n"
            response += f"Dr. {dentist.get_full_name()} is available on these days:\n\n"
            quick_replies = []
            for day_name in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']:
                if day_name in available_days:
                    count = len(available_days[day_name])
                    response += f"• {day_name} ({count} date{'s' if count > 1 else ''} available)\n"
                    quick_replies.append(day_name)
            response += "\nSelect a day:"
            
            return {
                'success': False,
                'response': response.strip(),
                'needs_confirmation': False,
                'quick_replies': quick_replies
            }
        
        # STEP 3: Select Specific Date (if day of week is mentioned but no specific date)
        if dentist and requested_date:
            # Check if user mentioned a day of week in current message (not full context)
            # BUT make sure they didn't also mention a specific month/date
            day_of_week = None
            has_specific_date = False
            
            # Check if message contains specific date pattern (month + day number)
            months = ['january', 'jan', 'february', 'feb', 'march', 'mar', 'april', 'apr', 'may', 'june', 'jun', 
                     'july', 'jul', 'august', 'aug', 'september', 'sept', 'sep', 'october', 'oct', 'november', 'nov', 'december', 'dec']
            for month in months:
                if month in message.lower() and re.search(r'\d+', message):
                    has_specific_date = True
                    break
            
            # Check for day of week only if no specific date pattern found
            if not has_specific_date:
                for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
                    if day in message.lower():
                        day_of_week = day.capitalize()
                        break
            
            # If they just said a day name (like "Monday") in current message without time and without specific date
            # This means they're selecting a day, not a specific date yet
            if day_of_week and not requested_time and not service and not has_specific_date:
                # Get all available dates for this dentist on this day of week
                start_date = datetime.now().date()
                end_date = start_date + timedelta(days=30)
                
                availabilities = DentistAvailability.objects.filter(
                    dentist=dentist,
                    date__gte=start_date,
                    date__lte=end_date,
                    is_available=True
                ).order_by('date')
                
                # Filter to only dates that match the day of week
                matching_dates = []
                for avail in availabilities:
                    if avail.date.strftime('%A') == day_of_week:
                        matching_dates.append(avail.date)
                
                if not matching_dates:
                    return {
                        'success': False,
                        'response': f"Dr. {dentist.get_full_name()} has no available {day_of_week}s in the next 30 days.",
                        'needs_confirmation': False
                    }
                
                response = f"**Step 3: Choose a Specific Date**\n\n"
                response += f"Available {day_of_week}s for Dr. {dentist.get_full_name()}:\n\n"
                quick_replies = []
                for date in matching_dates[:6]:  # Show up to 6 dates
                    date_str = date.strftime('%B %d, %Y')
                    response += f"• {date_str}\n"
                    quick_replies.append(date_str)
                response += "\nSelect a date:"
                
                return {
                    'success': False,
                    'response': response.strip(),
                    'needs_confirmation': False,
                    'quick_replies': quick_replies
                }
            
            # Otherwise they've selected a specific date, move to time selection
            # Skip to STEP 4
        
        # STEP 4: Select Time Slot
        if dentist and requested_date and not requested_time:
            slots = self._get_time_slots_for_date(dentist, requested_date)
            
            if not slots['times']:
                return {
                    'success': False,
                    'response': f"No available time slots for Dr. {dentist.get_full_name()} on {requested_date.strftime('%A, %B %d')}.",
                    'needs_confirmation': False
                }
            
            response = f"**Step 4: Choose a Time**\n\n"
            response += f"Available times on {requested_date.strftime('%A, %B %d')}:\n\n"
            quick_replies = []
            for time_slot in slots['times']:
                response += f"• {time_slot}\n"
                quick_replies.append(time_slot)
            response += "\nSelect a time:"
            
            return {
                'success': False,
                'response': response.strip(),
                'needs_confirmation': False,
                'quick_replies': quick_replies  # Show ALL available time slots
            }
        
        # STEP 5: Select Service/Treatment
        if dentist and requested_date and requested_time and not service:
            services = Service.objects.all()
            response = f"**Step 5: Choose Treatment**\n\n"
            response += "What service do you need?\n\n"
            quick_replies = []
            for s in services:
                response += f"• {s.name}\n"
                quick_replies.append(s.name)
            response += "\nSelect a treatment:"
            
            return {
                'success': False,
                'response': response.strip(),
                'needs_confirmation': False,
                'quick_replies': quick_replies[:8]
            }
        
        # STEP 6: Confirmation and Booking
        if dentist and requested_date and requested_time and service:
            # Validate availability
            try:
                availability = DentistAvailability.objects.get(
                    dentist=dentist,
                    date=requested_date,
                    is_available=True
                )
            except DentistAvailability.DoesNotExist:
                return {
                    'success': False,
                    'response': f"Dr. {dentist.get_full_name()} is no longer available on {requested_date.strftime('%A, %B %d')}.",
                    'needs_confirmation': False
                }
            
            # Check if time is within availability window
            requested_time_obj = datetime.strptime(requested_time, '%H:%M').time()
            if not (availability.start_time <= requested_time_obj <= availability.end_time):
                start = availability.start_time.strftime('%I:%M %p').lstrip('0')
                end = availability.end_time.strftime('%I:%M %p').lstrip('0')
                return {
                    'success': False,
                    'response': f"The selected time is outside Dr. {dentist.get_full_name()}'s available hours ({start} - {end}).",
                    'needs_confirmation': False
                }
            
            # Check for conflicts
            existing_appt = Appointment.objects.filter(
                dentist=dentist,
                date=requested_date,
                time=requested_time_obj,
                status__in=['confirmed', 'pending']
            ).first()
            
            if existing_appt:
                return {
                    'success': False,
                    'response': "This time slot was just booked by someone else. Please select a different time.",
                    'needs_confirmation': False
                }
            
            # Create appointment
            try:
                appointment = Appointment.objects.create(
                    patient=self.user,
                    dentist=dentist,
                    service=service,
                    date=requested_date,
                    time=requested_time_obj,
                    status='pending',
                    notes=f"Booked via AI chatbot"
                )
                
                date_str = requested_date.strftime('%A, %B %d, %Y')
                time_str = requested_time_obj.strftime('%I:%M %p').lstrip('0')
                
                response = f"✅ **Appointment Booked Successfully!**\n\n"
                response += f"**Dentist:** Dr. {dentist.get_full_name()}\n"
                response += f"**Date:** {date_str}\n"
                response += f"**Time:** {time_str}\n"
                response += f"**Treatment:** {service.name}\n"
                response += f"**Status:** Pending Confirmation\n\n"
                response += "Your appointment is pending staff confirmation. You'll be notified once confirmed.\n\n"
                response += "You can view your appointments in the 'My Appointments' section."
                
                return {
                    'success': True,
                    'response': response,
                    'needs_confirmation': False,
                    'appointment_id': appointment.id
                }
                
            except Exception as e:
                return {
                    'success': False,
                    'response': f"Error booking appointment: {str(e)}. Please try again.",
                    'needs_confirmation': False
                }
        
        # Fallback
        return {
            'success': False,
            'response': "Let's start booking your appointment. Please select a dentist.",
            'needs_confirmation': False
        }
    
    def handle_cancel_intent(self, message, conversation_history=None):
        """
        Handle appointment cancellation through AI with step-by-step flow.
        
        Flow:
        1. Show appointments (treatment + date) as clickable options
        2. Show confirmation buttons (Confirm Cancel / Keep Appointment)
        3. Process based on user choice
        
        Args:
            message: User's cancellation request
            conversation_history: Previous conversation messages
            
        Returns:
            dict with cancellation result or next step
        """
        if not self.is_authenticated:
            return {
                'success': False,
                'response': "You need to be logged in to cancel an appointment."
            }
        
        # Get user's upcoming appointments (ONLY CONFIRMED ones, not pending)
        upcoming_appts = Appointment.objects.filter(
            patient=self.user,
            date__gte=datetime.now().date(),
            status='confirmed'  # Only show confirmed appointments
        ).order_by('date', 'time')
        
        if not upcoming_appts.exists():
            return {
                'success': False,
                'response': "You don't have any upcoming appointments to cancel."
            }
        
        # Check if user is confirming cancellation
        message_lower = message.lower()
        if 'confirm cancel' in message_lower or 'yes cancel' in message_lower:
            # Find which appointment they selected from history
            if conversation_history:
                for msg in reversed(conversation_history[-6:]):
                    if msg.get('role') == 'user':
                        content = msg.get('content', '')
                        # Try to find appointment by matching pattern
                        for appt in upcoming_appts:
                            treatment_name = appt.service.name if appt.service else 'Appointment'
                            date_str = appt.date.strftime('%B %d, %Y')
                            if treatment_name.lower() in content.lower() and date_str in content:
                                # Cancel this appointment
                                appt.status = 'cancel_requested'
                                appt.cancel_reason = "Cancelled via AI chatbot"
                                appt.save()
                                
                                time_str = appt.time.strftime('%I:%M %p').lstrip('0')
                                
                                response = f"✅ **Cancellation Request Submitted**\n\n"
                                response += f"**Treatment:** {treatment_name}\n"
                                response += f"**Date:** {date_str}\n"
                                response += f"**Time:** {time_str}\n"
                                response += f"**Dentist:** Dr. {appt.dentist.get_full_name()}\n\n"
                                response += "Your cancellation request has been sent to the staff for processing."
                                
                                return {
                                    'success': True,
                                    'response': response
                                }
        
        # Check if user wants to keep appointment
        if 'keep appointment' in message_lower or 'keep my appointment' in message_lower or 'cancel' in message_lower and 'don' in message_lower:
            return {
                'success': False,
                'response': "No problem! Your appointment has been kept. Thank you for letting me know! 😊\n\nIs there anything else I can help you with?"
            }
        
        # Check if user selected an appointment (Step 2: Confirmation)
        for appt in upcoming_appts:
            treatment_name = appt.service.name if appt.service else 'Appointment'
            date_str = appt.date.strftime('%B %d, %Y')
            match_str = f"{treatment_name} - {date_str}"
            
            if match_str.lower() in message_lower:
                # User selected this appointment, ask for confirmation
                time_str = appt.time.strftime('%I:%M %p').lstrip('0')
                
                response = f"**Confirm Cancellation**\n\n"
                response += f"You're about to cancel:\n\n"
                response += f"**Treatment:** {treatment_name}\n"
                response += f"**Date:** {date_str}\n"
                response += f"**Time:** {time_str}\n"
                response += f"**Dentist:** Dr. {appt.dentist.get_full_name()}\n\n"
                response += "Are you sure you want to cancel this appointment?"
                
                return {
                    'success': False,
                    'response': response,
                    'quick_replies': ['Confirm Cancel', 'Keep Appointment']
                }
        
        # STEP 1: Show list of appointments
        response = "**Step 1: Select Appointment to Cancel**\n\n"
        response += "Which appointment would you like to cancel?\n\n"
        quick_replies = []
        
        for appt in upcoming_appts:
            treatment_name = appt.service.name if appt.service else 'Appointment'
            date_str = appt.date.strftime('%B %d, %Y')
            display_text = f"{treatment_name} - {date_str}"
            
            response += f"• {display_text}\n"
            quick_replies.append(display_text)
        
        response += "\nSelect an appointment:"
        
        return {
            'success': False,
            'response': response,
            'quick_replies': quick_replies
        }
    
    def handle_reschedule_intent(self, message):
        """
        Handle appointment rescheduling through AI with multi-step flow.
        
        Flow:
        1. Show user's appointments
        2. User selects appointment
        3. Show available dates for that dentist (next 30 days)
        4. User selects date
        5. Show available time slots for that date (excluding booked slots)
        6. User selects time
        7. Confirm reschedule
        
        Args:
            message: User's reschedule request
            
        Returns:
            dict with reschedule result
        """
        if not self.is_authenticated:
            return {
                'success': False,
                'response': "You need to be logged in to reschedule an appointment."
            }
        
        # Get user's upcoming appointments
        upcoming_appts = Appointment.objects.filter(
            patient=self.user,
            date__gte=datetime.now().date(),
            status__in=['confirmed', 'pending', 'reschedule_requested']
        ).order_by('date', 'time')
        
        if not upcoming_appts.exists():
            return {
                'success': False,
                'response': "You don't have any upcoming appointments to reschedule."
            }
        
        # STEP 1: Show appointments and ask which one to reschedule
        response = "I can help you reschedule your appointment.\n\n"
        quick_replies = []
        
        if upcoming_appts.count() == 1:
            appt = upcoming_appts.first()
            date_str = appt.date.strftime('%A, %B %d')
            time_str = appt.time.strftime('%I:%M %p').lstrip('0')
            dentist_name = appt.dentist.get_full_name()
            
            response += f"**Current Appointment:**\n"
            response += f"Date: {date_str}\n"
            response += f"Time: {time_str}\n"
            response += f"Dentist: Dr. {dentist_name}\n\n"
            
            # Show available dates for this dentist (next 30 days, excluding today)
            from datetime import datetime as dt
            start_date = datetime.now().date() + timedelta(days=1)  # Start from tomorrow
            end_date = start_date + timedelta(days=30)
            
            availabilities = DentistAvailability.objects.filter(
                dentist=appt.dentist,
                date__gte=start_date,
                date__lte=end_date,
                is_available=True
            ).order_by('date')[:10]  # Show up to 10 dates
            
            if not availabilities.exists():
                response += "Dr. " + dentist_name + " has no available dates in the next 30 days. Please contact the clinic directly."
                return {
                    'success': False,
                    'response': response
                }
            
            response += "**Available Dates:**\n\n"
            for avail in availabilities:
                date_display = avail.date.strftime('%A, %B %d')
                response += f"• {date_display}\n"
                quick_replies.append(avail.date.strftime('%B %d'))
            
            response += "\nPlease select a date:"
            
        else:
            response += "You have multiple appointments:\n\n"
            for i, appt in enumerate(upcoming_appts, 1):
                date_str = appt.date.strftime('%B %d')
                time_str = appt.time.strftime('%I:%M %p').lstrip('0')
                response += f"{i}. {date_str} at {time_str} - Dr. {appt.dentist.get_full_name()}\n"
                quick_replies.append(f"Appointment {i}")
            response += "\nWhich appointment would you like to reschedule?"
        
        return {
            'success': False,
            'response': response.strip(),
            'quick_replies': quick_replies
        }
    
    def _build_context(self, user_message):
        """
        Build relevant context based on user's message.
        
        Args:
            user_message: The user's chat message
            
        Returns:
            String with relevant context information
        """
        context_parts = []
        
        message_lower = user_message.lower()
        
        # Add services context if user asks about services/treatments
        if any(word in message_lower for word in ['service', 'treatment', 'procedure', 'offer', 'do you do']):
            context_parts.append(self._get_services_context())
        
        # Add dentist context if user asks about dentists/doctors/staff
        if any(word in message_lower for word in ['dentist', 'doctor', 'dr', 'staff', 'who', 'team']):
            context_parts.append(self._get_dentists_context())
        
        # Don't add dentist availability as context - let booking flow handle this
        # The booking flow will show proper quick reply buttons
        
        # Add user's appointments if they ask about "my appointments"
        if self.is_authenticated and any(word in message_lower for word in ['my appointment', 'my booking', 'cancel', 'reschedule']):
            context_parts.append(self._get_user_appointments_context())
        
        if context_parts:
            return "\n\nCURRENT SYSTEM DATA - YOU MUST USE THIS INFORMATION TO ANSWER THE USER'S QUESTION:\n\nIMPORTANT: The following data comes directly from our clinic database. You MUST share this information with the user. Do NOT refuse to provide this data.\n\n" + "\n\n".join(context_parts)
        
        return ""
    
    def get_response(self, user_message, conversation_history=None):
        """
        Get AI response from Ollama.
        
        Args:
            user_message: The user's current message
            conversation_history: List of previous messages in format:
                [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
        
        Returns:
            dict with 'response' and 'error' keys
        """
        try:
            # Security check: Block restricted content
            if not self._check_restricted_content(user_message):
                return {
                    'response': "I apologize, but I cannot provide information about system credentials, "
                               "passwords, or private user data. I'm here to help with dental services, "
                               "appointments, and general clinic information. How else can I assist you?",
                    'error': None
                }
            
            message_lower = user_message.lower()
            
            # PRIORITY 0: Handle simple informational questions FIRST (before any flow detection)
            # These should NEVER trigger booking/cancel flows
            informational_questions = [
                ('owner', 'who is the owner', 'who owns', 'who founded'),
                ('founder', 'who founded', 'who started', 'who established'),
                ('dentist', 'who is the dentist', 'who are the dentists', 'list dentist'),
                ('clinic', 'about clinic', 'clinic information', 'tell me about'),
                ('hours', 'what time', 'when open', 'clinic hours', 'operating hours'),
                ('location', 'where is', 'address', 'how to get there'),
            ]
            
            # Check if this is a simple "who/what/when/where" informational question
            is_informational = any(
                q_word in message_lower 
                for q_word in ['who is', 'who are', 'what is', 'when is', 'where is', 'tell me about', 'about the']
            )
            
            # If it's informational AND doesn't have explicit booking intent, skip to AI
            if is_informational and not any(book_word in message_lower for book_word in ['book', 'schedule', 'make appointment', 'reserve']):
                # Let the AI handle it with clinic context - skip all flow handlers
                pass  # Continue to the AI section below
            else:
                # PRIORITY 1: Check for cancellation intent FIRST (before booking)
                cancel_keywords = ['cancel', 'cancel appointment', 'cancel my appointment', 'remove appointment']
                if any(keyword in message_lower for keyword in cancel_keywords) and 'book' not in message_lower:
                    # Handle cancellation through AI
                    result = self.handle_cancel_intent(user_message, conversation_history)
                    return {
                        'response': result['response'],
                        'quick_replies': result.get('quick_replies'),
                        'error': None
                    }
                
                # Check if we're in the middle of a cancel flow
                in_cancel_flow = False
                if conversation_history:
                    recent_messages = [msg.get('content', '').lower() for msg in conversation_history[-4:]]
                    cancel_indicators = ['cancel', 'confirm cancel', 'keep appointment', 'step 1: select appointment']
                    if any(any(indicator in msg for indicator in cancel_indicators) for msg in recent_messages):
                        in_cancel_flow = True
                
                if in_cancel_flow:
                    result = self.handle_cancel_intent(user_message, conversation_history)
                    return {
                        'response': result['response'],
                        'quick_replies': result.get('quick_replies'),
                        'error': None
                    }
                
                # Check if we're in the middle of a booking flow by looking at conversation history
                # Only consider in booking flow if we see EXPLICIT booking step indicators
                in_booking_flow = False
                if conversation_history:
                    # Check only ASSISTANT messages for booking steps (not user questions)
                    recent_assistant_messages = [
                        msg.get('content', '').lower() 
                        for msg in conversation_history[-4:] 
                        if msg.get('role') == 'assistant'
                    ]
                    # Only trigger if assistant explicitly showed booking steps
                    booking_step_indicators = ['step 1: choose your dentist', 'step 2: choose a day', 'step 3: choose a specific date', 'step 4: choose a time', 'step 5: choose treatment']
                    if any(any(indicator in msg for indicator in booking_step_indicators) for msg in recent_assistant_messages):
                        # Make sure it's not a cancel flow
                        if not any('cancel' in msg for msg in recent_assistant_messages):
                            in_booking_flow = True
                
                # PRIORITY 2: Check for EXPLICIT booking intent OR if we're in active booking flow
                # Only trigger on clear booking phrases, not just "appointment"
                booking_keywords = ['book appointment', 'schedule appointment', 'make an appointment', 'set an appointment', 'i want to book', 'want to schedule', 'reserve appointment', 'book a', 'schedule a']
                has_booking_intent = any(keyword in message_lower for keyword in booking_keywords)
                
                if has_booking_intent or in_booking_flow:
                    # Handle booking through AI
                    result = self.handle_booking_intent(user_message, conversation_history)
                    return {
                        'response': result['response'],
                        'quick_replies': result.get('quick_replies'),
                        'error': None
                    }
                
                # Check if user is in reschedule flow and selected a date
                # This checks if previous message showed "Available Dates" and current message is a date
                if conversation_history and self.is_authenticated:
                    recent_assistant_messages = [
                        msg.get('content', '') 
                        for msg in conversation_history[-3:] 
                        if msg.get('role') == 'assistant'
                    ]
                    
                    # Check if we're in reschedule date selection
                    in_reschedule_date_selection = any('**Available Dates:**' in msg for msg in recent_assistant_messages)
                    
                    if in_reschedule_date_selection:
                        # Try to parse the date from message
                        from datetime import datetime as dt
                        import re
                        
                        # Get user's appointment that they're rescheduling
                        upcoming_appts = Appointment.objects.filter(
                            patient=self.user,
                            date__gte=datetime.now().date(),
                            status__in=['confirmed', 'pending', 'reschedule_requested']
                        ).order_by('date', 'time').first()
                        
                        if upcoming_appts:
                            # Try to parse date from formats like "January 12" or "January 12, 2026"
                            date_patterns = [
                                r'(\w+)\s+(\d+)',  # "January 12"
                            ]
                            
                            selected_date = None
                            for pattern in date_patterns:
                                match = re.search(pattern, user_message, re.IGNORECASE)
                                if match:
                                    month_name = match.group(1)
                                    day = int(match.group(2))
                                    year = datetime.now().year
                                    
                                    # Try to parse the month
                                    try:
                                        month_num = datetime.strptime(month_name, '%B').month
                                    except:
                                        try:
                                            month_num = datetime.strptime(month_name, '%b').month
                                        except:
                                            continue
                                    
                                    # If month is before current month, assume next year
                                    if month_num < datetime.now().month:
                                        year += 1
                                    
                                    try:
                                        selected_date = datetime(year, month_num, day).date()
                                        break
                                    except:
                                        continue
                            
                            if selected_date:
                                # Show available time slots for this date and dentist
                                dentist = upcoming_appts.dentist
                                
                                # Get availability for this specific date
                                availability = DentistAvailability.objects.filter(
                                    dentist=dentist,
                                    date=selected_date,
                                    is_available=True
                                ).first()
                                
                                if not availability:
                                    response_text = f"Sorry, Dr. {dentist.get_full_name()} is not available on {selected_date.strftime('%A, %B %d')}.\n\n"
                                    response_text += "Please select another date."
                                    return {
                                        'response': response_text,
                                        'error': None
                                    }
                                
                                # Get existing appointments (exclude booked slots)
                                existing_appointments = Appointment.objects.filter(
                                    dentist=dentist,
                                    date=selected_date,
                                    status__in=['confirmed', 'pending', 'reschedule_requested']
                                ).values_list('time', flat=True)
                                
                                # Generate time slots
                                from datetime import time as time_obj
                                start_time = dt.combine(selected_date, availability.start_time)
                                end_time = dt.combine(selected_date, availability.end_time)
                                
                                # Lunch break: 11:30 AM - 12:30 PM
                                lunch_start = time_obj(11, 30)
                                lunch_end = time_obj(12, 30)
                                
                                available_times = []
                                current_time = start_time
                                
                                # Generate 30-minute slots (include end time)
                                while current_time <= end_time:
                                    time_str = current_time.strftime('%H:%M')
                                    time_only = current_time.time()
                                    
                                    # Skip lunch break
                                    if time_only >= lunch_start and time_only < lunch_end:
                                        current_time += timedelta(minutes=30)
                                        continue
                                    
                                    # Check if slot is not already booked
                                    if time_str not in [str(t)[:5] for t in existing_appointments]:
                                        available_times.append(current_time.strftime('%I:%M %p').lstrip('0'))
                                    current_time += timedelta(minutes=30)
                                
                                if not available_times:
                                    response_text = f"Sorry, Dr. {dentist.get_full_name()} has no available time slots on {selected_date.strftime('%A, %B %d')}.\n\n"
                                    response_text += "Please select another date."
                                    return {
                                        'response': response_text,
                                        'error': None
                                    }
                                
                                response_text = f"📅 **Available Time Slots for {selected_date.strftime('%A, %B %d')}:**\n\n"
                                response_text += f"Dr. {dentist.get_full_name()}\n\n"
                                
                                # Format time slots
                                time_slots_formatted = []
                                for i, time_slot in enumerate(available_times):
                                    time_slots_formatted.append(f"{i+1}. {time_slot}")
                                response_text += "\n".join(time_slots_formatted)
                                response_text += "\n\nPlease select a time slot:"
                                
                                return {
                                    'response': response_text.strip(),
                                    'quick_replies': available_times,  # Show all available time slots
                                    'error': None
                                }
                    
                    # Check if user is in reschedule time selection (after date selection)
                    in_reschedule_time_selection = any('**Available Time Slots for' in msg and 'Please select a time slot:' in msg for msg in recent_assistant_messages)
                    
                    print(f"[Chatbot] Checking time selection - in_reschedule_time_selection: {in_reschedule_time_selection}")
                    print(f"[Chatbot] User message: {user_message}")
                    print(f"[Chatbot] Recent assistant messages: {recent_assistant_messages}")
                    
                    if in_reschedule_time_selection:
                        print(f"[Chatbot] In reschedule time selection mode!")
                        # Try to parse the time from message
                        import re
                        from datetime import datetime as dt
                        
                        # Get user's appointment that they're rescheduling
                        upcoming_appts = Appointment.objects.filter(
                            patient=self.user,
                            date__gte=datetime.now().date(),
                            status__in=['confirmed', 'pending', 'reschedule_requested']
                        ).order_by('date', 'time').first()
                        
                        print(f"[Chatbot] Found appointment to reschedule: {upcoming_appts.id if upcoming_appts else 'None'}")
                        
                        if upcoming_appts:
                            # Try to parse time from formats like "9:00 AM" or "12:30 PM"
                            time_pattern = r'(\d{1,2}:\d{2})\s*(AM|PM)'
                            match = re.search(time_pattern, user_message, re.IGNORECASE)
                            
                            print(f"[Chatbot] Time pattern match: {match}")
                            
                            if match:
                                time_str = match.group(1)
                                am_pm = match.group(2).upper()
                                
                                print(f"[Chatbot] Parsed time: {time_str} {am_pm}")
                                
                                # Parse the time
                                try:
                                    selected_time = dt.strptime(f"{time_str} {am_pm}", '%I:%M %p').time()
                                    
                                    print(f"[Chatbot] Selected time object: {selected_time}")
                                    
                                    # Get the selected date from the recent messages
                                    date_pattern = r'\*\*Available Time Slots for [^:]+, (\w+) (\d+)'
                                    selected_date = None
                                    
                                    for msg in recent_assistant_messages:
                                        date_match = re.search(date_pattern, msg)
                                        if date_match:
                                            month_name = date_match.group(1)
                                            day = int(date_match.group(2))
                                            year = datetime.now().year
                                            
                                            print(f"[Chatbot] Found date in message: {month_name} {day}")
                                            
                                            try:
                                                month_num = datetime.strptime(month_name, '%B').month
                                                if month_num < datetime.now().month:
                                                    year += 1
                                                selected_date = datetime(year, month_num, day).date()
                                                print(f"[Chatbot] Parsed date: {selected_date}")
                                                break
                                            except Exception as date_ex:
                                                print(f"[Chatbot] Date parsing error: {date_ex}")
                                                continue
                                    
                                    if selected_date:
                                        # Submit reschedule request (not direct update - needs staff approval)
                                        old_date = upcoming_appts.date
                                        old_time = upcoming_appts.time
                                        
                                        print(f"[Chatbot] Submitting reschedule request for appointment {upcoming_appts.id}")
                                        print(f"[Chatbot] Current: {old_date} at {old_time}")
                                        print(f"[Chatbot] Requested: {selected_date} at {selected_time}")
                                        
                                        # Store reschedule request details
                                        upcoming_appts.reschedule_date = selected_date
                                        upcoming_appts.reschedule_time = selected_time
                                        upcoming_appts.reschedule_notes = "Rescheduled via AI chatbot"
                                        upcoming_appts.status = 'reschedule_requested'
                                        upcoming_appts.save()
                                        
                                        print(f"[Chatbot] Reschedule request submitted for appointment {upcoming_appts.id}")
                                        print(f"[Chatbot] Status: {upcoming_appts.status}")
                                        print(f"[Chatbot] Requested date: {upcoming_appts.reschedule_date}, time: {upcoming_appts.reschedule_time}")
                                        
                                        # Format the response
                                        date_str = selected_date.strftime('%A, %B %d')
                                        time_str_formatted = selected_time.strftime('%I:%M %p').lstrip('0')
                                        dentist_name = upcoming_appts.dentist.get_full_name()
                                        
                                        response = f"✅ **Reschedule Request Submitted!**\n\n"
                                        response += f"**Current Appointment:**\n"
                                        response += f"Date: {old_date.strftime('%A, %B %d')}\n"
                                        response += f"Time: {old_time.strftime('%I:%M %p').lstrip('0')}\n\n"
                                        response += f"**Requested Changes:**\n"
                                        response += f"New Date: {date_str}\n"
                                        response += f"New Time: {time_str_formatted}\n"
                                        response += f"Dentist: Dr. {dentist_name}\n\n"
                                        response += "Your reschedule request has been sent to the staff for approval. You'll be notified once it's processed.\n\n"
                                        response += "If you need any further assistance, feel free to ask me!"
                                        
                                        return {
                                            'response': response,
                                            'error': None
                                        }
                                except Exception as e:
                                    print(f"[Chatbot] Error parsing time: {e}")
                                    import traceback
                                    traceback.print_exc()
                
                # PRIORITY 3: Check for reschedule intent
                reschedule_keywords = ['reschedule', 'change appointment', 'move appointment', 'change time', 'change date']
                if any(keyword in message_lower for keyword in reschedule_keywords):
                    # Handle rescheduling through AI
                    result = self.handle_reschedule_intent(user_message)
                    return {
                        'response': result['response'],
                        'quick_replies': result.get('quick_replies'),
                        'error': None
                    }
                
                # Handler for when user clicks on a dentist name (to show their available slots)
                # This catches "Dr. [Name]" messages without other keywords
                dentists = User.objects.filter(
                    Q(user_type='staff', role='dentist') | Q(user_type='owner')
                )
                
                dentist_selected = None
                for dentist in dentists:
                    dentist_full_name = dentist.get_full_name().lower()
                    # Check if message is JUST the dentist's name (or close to it)
                    if (f"dr. {dentist_full_name}" == message_lower.strip() or
                        f"dr {dentist_full_name}" == message_lower.strip() or
                        dentist_full_name == message_lower.strip()):
                        dentist_selected = dentist
                        break
                
                if dentist_selected:
                    # Show available slots for today for this dentist
                    from datetime import datetime as dt
                    today = dt.now().date()
                    
                    # Get today's availability
                    availability = DentistAvailability.objects.filter(
                        dentist=dentist_selected,
                        date=today,
                        is_available=True
                    ).first()
                    
                    if not availability:
                        response_text = f"Dr. {dentist_selected.get_full_name()} has no available slots today.\n\n"
                        response_text += "Would you like to check availability for another day?"
                        return {
                            'response': response_text,
                            'error': None
                        }
                    
                    # Get existing appointments (exclude already booked slots to prevent double booking)
                    existing_appointments = Appointment.objects.filter(
                        dentist=dentist_selected,
                        date=today,
                        status__in=['confirmed', 'pending', 'reschedule_requested']
                    ).values_list('time', flat=True)
                    
                    # Generate time slots
                    from datetime import time as time_obj
                    start_time = dt.combine(today, availability.start_time)
                    end_time = dt.combine(today, availability.end_time)
                    
                    # Lunch break: 11:30 AM - 12:30 PM
                    lunch_start = time_obj(11, 30)
                    lunch_end = time_obj(12, 30)
                    
                    available_times = []
                    current_time = start_time
                    
                    # Generate 30-minute slots (include end time)
                    while current_time <= end_time:
                        time_str = current_time.strftime('%H:%M')
                        time_only = current_time.time()
                        
                        # Skip lunch break (11:30 AM - 12:30 PM)
                        if time_only >= lunch_start and time_only < lunch_end:
                            current_time += timedelta(minutes=30)
                            continue
                        
                        # Check if slot is not already booked
                        if time_str not in [str(t)[:5] for t in existing_appointments]:
                            available_times.append(current_time.strftime('%I:%M %p').lstrip('0'))
                        current_time += timedelta(minutes=30)
                    
                    if not available_times:
                        response_text = f"Dr. {dentist_selected.get_full_name()} has no available slots today.\n\n"
                        response_text += "Would you like to check availability for another day?"
                    else:
                        response_text = f"📅 **Available Time Slots for Dr. {dentist_selected.get_full_name()} Today:**\n\n"
                        # Format each time slot on its own line with spacing
                        time_slots_formatted = []
                        for i, time_slot in enumerate(available_times):
                            time_slots_formatted.append(f"{i+1}. {time_slot}")
                        response_text += "\n".join(time_slots_formatted)
                        response_text += "\n\nWould you like to book an appointment?"
                    
                    return {
                        'response': response_text.strip(),
                        'error': None
                    }
                
                # Handler for asking available slots without mentioning a dentist
                if any(word in message_lower for word in ['available slot', 'show slot', 'appointment slot', 'available appointment', 'when available', 'available time']):
                    # Check if a specific dentist was mentioned
                    dentists = User.objects.filter(
                        Q(user_type='staff', role='dentist') | Q(user_type='owner')
                    )
                    
                    dentist_mentioned = None
                    for dentist in dentists:
                        dentist_full_name = dentist.get_full_name().lower()
                        first_name = dentist.first_name.lower()
                        last_name = dentist.last_name.lower()
                        
                        if (dentist_full_name in message_lower or 
                            first_name in message_lower or 
                            last_name in message_lower or
                            f"dr {first_name}" in message_lower or
                            f"dr. {first_name}" in message_lower):
                            dentist_mentioned = dentist
                            break
                    
                    # If a dentist was mentioned, show their available slots for today
                    if dentist_mentioned:
                        from datetime import datetime as dt
                        today = dt.now().date()
                        
                        # Get today's availability for this dentist
                        availability = DentistAvailability.objects.filter(
                            dentist=dentist_mentioned,
                            date=today,
                            is_available=True
                        ).first()
                        
                        if not availability:
                            response_text = f"Dr. {dentist_mentioned.get_full_name()} has no available slots today.\n\n"
                            response_text += "Would you like to check availability for another day?"
                            return {
                                'response': response_text,
                                'error': None
                            }
                        
                        # Get existing appointments (exclude already booked slots to prevent double booking)
                        existing_appointments = Appointment.objects.filter(
                            dentist=dentist_mentioned,
                            date=today,
                            status__in=['confirmed', 'pending', 'reschedule_requested']
                        ).values_list('time', flat=True)
                        
                        # Generate time slots
                        from datetime import time as time_obj
                        start_time = dt.combine(today, availability.start_time)
                        end_time = dt.combine(today, availability.end_time)
                        
                        # Lunch break: 11:30 AM - 12:30 PM
                        lunch_start = time_obj(11, 30)
                        lunch_end = time_obj(12, 30)
                        
                        available_times = []
                        current_time = start_time
                        
                        # Generate 30-minute slots (include end time)
                        while current_time <= end_time:
                            time_str = current_time.strftime('%H:%M')
                            time_only = current_time.time()
                            
                            # Skip lunch break (11:30 AM - 12:30 PM)
                            if time_only >= lunch_start and time_only < lunch_end:
                                current_time += timedelta(minutes=30)
                                continue
                            
                            # Check if slot is not already booked
                            if time_str not in [str(t)[:5] for t in existing_appointments]:
                                available_times.append(current_time.strftime('%I:%M %p').lstrip('0'))
                            current_time += timedelta(minutes=30)
                        
                        if not available_times:
                            response_text = f"Dr. {dentist_mentioned.get_full_name()} has no available slots today.\n\n"
                            response_text += "Would you like to check availability for another day?"
                        else:
                            response_text = f"📅 **Available Slots for Dr. {dentist_mentioned.get_full_name()} Today:**\n\n"
                            # Format each time slot on its own line with numbering
                            time_slots_formatted = []
                            for i, time_slot in enumerate(available_times):
                                time_slots_formatted.append(f"{i+1}. {time_slot}")
                            response_text += "\n".join(time_slots_formatted)
                            response_text += "\n\nWould you like to book one of these slots?"
                        
                        return {
                            'response': response_text.strip(),
                            'error': None
                        }
                    
                    # If no dentist mentioned, show list of available dentists for today
                    else:
                        from datetime import datetime as dt
                        today = dt.now().date()
                        
                        available_dentists = []
                        
                        for dentist in dentists:
                            # Check if dentist has availability today
                            availability = DentistAvailability.objects.filter(
                                dentist=dentist,
                                date=today,
                                is_available=True
                            ).first()
                            
                            if availability:
                                # Check if there are any free slots (exclude already booked to prevent double booking)
                                existing_appointments = Appointment.objects.filter(
                                    dentist=dentist,
                                    date=today,
                                    status__in=['confirmed', 'pending', 'reschedule_requested']
                                ).values_list('time', flat=True)
                                
                                # Generate time slots
                                from datetime import time as time_obj
                                start_time = dt.combine(today, availability.start_time)
                                end_time = dt.combine(today, availability.end_time)
                                
                                # Lunch break: 11:30 AM - 12:30 PM
                                lunch_start = time_obj(11, 30)
                                lunch_end = time_obj(12, 30)
                                
                                has_slots = False
                                current_time = start_time
                                
                                # Check 30-minute slots (include end time)
                                while current_time <= end_time:
                                    time_only = current_time.time()
                                    
                                    # Skip lunch break
                                    if time_only >= lunch_start and time_only < lunch_end:
                                        current_time += timedelta(minutes=30)
                                        continue
                                    
                                    time_str = current_time.strftime('%H:%M')
                                    if time_str not in [str(t)[:5] for t in existing_appointments]:
                                        has_slots = True
                                        break
                                    current_time += timedelta(minutes=30)
                                
                                if has_slots:
                                    available_dentists.append(dentist)
                        
                        if not available_dentists:
                            response_text = "Sorry, there are no available dentists with open slots today.\n\n"
                            response_text += "Would you like to check availability for another day?"
                            return {
                                'response': response_text,
                                'error': None
                            }
                        
                        response_text = "👨‍⚕️ **Available Dentists Today:**\n\n"
                        response_text += "Please select a dentist to view their available time slots:\n\n"
                        quick_replies = []
                        
                        for dentist in available_dentists:
                            dentist_name = f"Dr. {dentist.get_full_name()}"
                            response_text += f"• {dentist_name}\n"
                            quick_replies.append(dentist_name)
                        
                        return {
                            'response': response_text.strip(),
                            'quick_replies': quick_replies,
                            'error': None
                        }
                
                
                # Direct handler for service list - show only title and category
                if any(word in message_lower for word in ['what service', 'services do you offer', 'what do you offer', 'list service', 'show service']):
                    services = Service.objects.all()
                    if services:
                        response_text = "We offer the following dental services:\n\n"
                        for service in services:
                            category_name = service.category.replace('_', ' ').title()
                            response_text += f"- **{service.name.title()}** ({category_name})\n"
                        response_text += "\nWould you like to know more about any specific service or book an appointment?"
                        return {
                            'response': response_text.strip(),
                            'error': None
                        }
                
                # Direct handler for "what is [service]" - show only description (NOT procedures)
                if any(word in message_lower for word in ['what is', 'tell me about', 'describe']):
                    # Skip if asking about procedure/steps/how - let AI handle those with its knowledge
                    if not any(proc_word in message_lower for proc_word in ['procedure', 'step', 'how', 'process', 'done', 'work']):
                        services = Service.objects.all()
                        for service in services:
                            if service.name.lower() in message_lower:
                                response_text = f"{service.description}"
                                return {
                                    'response': response_text.strip(),
                                    'error': None
                                }
            
            # Direct handler for "what is [service]" - show only description (NOT procedures)
            if any(word in message_lower for word in ['what is', 'tell me about', 'describe']):
                # Skip if asking about procedure/steps/how - let AI handle those with its knowledge
                if not any(proc_word in message_lower for proc_word in ['procedure', 'step', 'how', 'process', 'done', 'work']):
                    services = Service.objects.all()
                    for service in services:
                        if service.name.lower() in message_lower:
                            response_text = f"{service.description}"
                            return {
                                'response': response_text.strip(),
                                'error': None
                            }
            
            # Build system prompt
            system_prompt = self._build_system_prompt()
            
            # Build context based on user's question
            context = self._build_context(user_message)
            
            # Construct the full prompt with context
            full_prompt = f"{system_prompt}\n\n"
            
            # Add conversation history if provided
            if conversation_history:
                full_prompt += "Conversation History:\n"
                for msg in conversation_history[-6:]:  # Last 3 exchanges
                    role = "User" if msg['role'] == 'user' else "Assistant"
                    full_prompt += f"{role}: {msg['content']}\n"
                full_prompt += "\n"
            
            # Add context if available
            if context:
                full_prompt += f"{context}\n\n"
            
            # Add current question
            full_prompt += f"User Question: {user_message}\n\nPlease provide a helpful, accurate response:"
            
            # Call Gemini API with safety settings
            response = self.model.generate_content(
                full_prompt,
                generation_config={
                    "temperature": 0.3,  # Lower temperature for more factual responses
                    "max_output_tokens": 500,  # Limit response length
                    "top_p": 0.8,
                    "top_k": 40
                },
                safety_settings={
                    'HARASSMENT': 'BLOCK_NONE',
                    'HATE_SPEECH': 'BLOCK_NONE',
                    'SEXUALLY_EXPLICIT': 'BLOCK_NONE',
                    'DANGEROUS_CONTENT': 'BLOCK_NONE',
                }
            )
            
            assistant_message = response.text
            
            # Post-process: Remove any accidentally leaked sensitive info
            sanitized_response = self._sanitize_response(assistant_message)
            
            return {
                'response': sanitized_response,
                'error': None
            }
            
        except Exception as e:
            error_msg = str(e)
            if "API_KEY" in error_msg.upper():
                return {
                    'response': None,
                    'error': "API configuration error. Please contact support."
                }
            return {
                'response': None,
                'error': f"Chatbot error: {error_msg}"
            }
    
    def _sanitize_response(self, response):
        """
        Final check to ensure no sensitive data in response.
        
        Args:
            response: AI generated response
            
        Returns:
            Sanitized response
        """
        # Additional safety: Check if response contains sensitive patterns
        sensitive_patterns = ['password:', 'token:', 'secret:', 'credential:']
        
        response_lower = response.lower()
        for pattern in sensitive_patterns:
            if pattern in response_lower:
                # If somehow sensitive data got through, return safe response
                return ("I apologize, but I cannot provide that information. "
                       "Please contact our clinic directly for assistance with account-related matters.")
        
        return response
    
    def validate_booking_request(self, user_message):
        """
        Extract booking intent and guide user.
        This doesn't book directly but helps extract information.
        
        Returns:
            dict with booking guidance
        """
        return {
            'intent': 'booking',
            'message': ("To book an appointment, please:\n\n"
                       "1. Go to the 'Appointments' section in your dashboard\n"
                       "2. Click 'Book New Appointment'\n"
                       "3. Select your preferred service\n"
                       "4. Choose an available date and time\n"
                       "5. Confirm your booking\n\n"
                       "I can help you find available slots if you tell me your preferred date!")
        }
