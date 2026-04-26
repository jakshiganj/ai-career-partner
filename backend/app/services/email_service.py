import os
import smtplib
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

def _send_email_sync(to_email: str, subject: str, html_content: str, gmail_address: str, gmail_password: str) -> bool:
    """Synchronous helper for SMTP operations."""
    try:
        msg = MIMEMultipart()
        msg['From'] = f"AI Career Partner <{gmail_address}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_content, 'html'))

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(gmail_address, gmail_password)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"[EMAIL_SERVICE] ❌ SMTP Error: {e}")
        return False

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

        success = await asyncio.to_thread(_send_email_sync, to_email, subject, html_content, gmail_address, gmail_password)
        if success:
            print(f"[EMAIL_SERVICE] ✅ Email sent successfully via Gmail to {to_email}")
        return success
    except Exception as e:
        print(f"[EMAIL_SERVICE] ❌ Failed to send email via Gmail: {e}")
        return False


async def send_password_reset_email(to_email: str, reset_link: str) -> bool:
    """
    Sends a password reset email with a branded HTML template using Gmail SMTP.
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
            <body style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 0; background-color: #f4f4f5;">
                <div style="max-width: 520px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                    
                    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%); padding: 32px 24px; text-align: center;">
                        <div style="font-size: 2rem; margin-bottom: 8px;">⚡</div>
                        <h1 style="color: #ffffff; margin: 0; font-size: 1.5rem; font-weight: 700;">AI Career Partner</h1>
                    </div>

                    <div style="padding: 32px 24px;">
                        <h2 style="color: #1f2937; margin-top: 0; font-size: 1.25rem;">Reset Your Password</h2>
                        <p style="color: #4b5563; margin-bottom: 24px;">
                            We received a request to reset your password. Click the button below to set a new one. 
                            This link will expire in <strong>15 minutes</strong>.
                        </p>
                        
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="{reset_link}" 
                               style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); 
                                      color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; 
                                      font-weight: 600; font-size: 1rem; letter-spacing: 0.3px;">
                                Reset Password
                            </a>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 0.85rem;">
                            If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
                        </p>
                        
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                        
                        <p style="color: #9ca3af; font-size: 0.75rem; text-align: center;">
                            If the button doesn't work, copy and paste this link into your browser:<br/>
                            <a href="{reset_link}" style="color: #6366f1; word-break: break-all;">{reset_link}</a>
                        </p>
                    </div>
                </div>
            </body>
        </html>
        """

        subject = "Reset Your Password — AI Career Partner"
        success = await asyncio.to_thread(_send_email_sync, to_email, subject, html_content, gmail_address, gmail_password)
        if success:
            print(f"[EMAIL_SERVICE] ✅ Password reset email sent to {to_email}")
        return success
    except Exception as e:
        print(f"[EMAIL_SERVICE] ❌ Failed to send password reset email: {e}")
        return False
