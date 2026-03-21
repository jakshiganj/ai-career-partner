import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

async def send_digest_email(to_email: str, subject: str, digest_data: dict) -> bool:
    """
    Sends the weekly digest email using Gmail SMTP.
    """
    load_dotenv()
    gmail_address = os.getenv("GMAIL_ADDRESS")
    gmail_password = os.getenv("GMAIL_APP_PASSWORD")
    
    if not gmail_address or not gmail_password:
        print("[EMAIL_SERVICE] ⚠️ GMAIL_ADDRESS or GMAIL_APP_PASSWORD not found in environment.")
        return False
        
    try:
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                <h2 style="color: #2563eb;">Weekly Career Insights</h2>
                <p>Here is your weekly summary for the <b>{digest_data.get('target_role', 'Target Role')}</b> role.</p>
                
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0;">📊 Activity Summary</h3>
                    <ul>
                        <li>Pipelines Run: {digest_data.get('pipelines_run', 0)}</li>
                        <li>New Job Matches: {digest_data.get('new_job_matches', 0)}</li>
                    </ul>
                </div>

                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="margin-top: 0;">🔥 Hot Skill to Learn</h3>
                    <p>Based on market trends, you should focus on: <b style="color: #e11d48;">{digest_data.get('hot_skill_to_learn', 'N/A')}</b></p>
                </div>
                
                <p>Keep up the great work!</p>
                <p style="font-size: 0.8em; color: #6b7280;">AI Career Partner</p>
            </body>
        </html>
        """

        # Create the email message
        msg = MIMEMultipart()
        msg['From'] = f"AI Career Partner <{gmail_address}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        # Attach the HTML body
        msg.attach(MIMEText(html_content, 'html'))

        # Connect to Gmail SMTP server
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()  # Secure the connection
        
        # Login and send
        server.login(gmail_address, gmail_password)
        server.send_message(msg)
        server.quit()

        print(f"[EMAIL_SERVICE] ✅ Email sent successfully via Gmail to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL_SERVICE] ❌ Failed to send email via Gmail: {e}")
        return False
