# PayMongo Payment Gateway Setup Guide
## Testing & Production Integration for Dorotheo Dental Clinic

---

## 🎯 Quick Setup Overview

You'll integrate PayMongo for:
- **Billing payments** (after dental services)
- **Appointment deposits** (optional)
- **Online consultations** (future feature)

---

## 📋 Step 1: Configure Test API Keys

### Backend Setup (.env file)

Add your TEST keys to `backend/.env`:

```bash
# PayMongo Test API Keys (from your dashboard)
PAYMONGO_SECRET_KEY=sk_test_G2sBxziRCBziE2uM8ve9zAWlB
PAYMONGO_PUBLIC_KEY=pk_test_mzf8pn3i5issxyuZTPbsEB1t

# PayMongo API Base URL
PAYMONGO_API_URL=https://api.paymongo.com/v1

# Webhook Secret (we'll generate this later)
PAYMONGO_WEBHOOK_SECRET=

# Environment flag
PAYMONGO_MODE=test  # Change to 'live' for production
```

### Update .env.example

```bash
# Add to backend/.env.example
PAYMONGO_SECRET_KEY=your_secret_key_here
PAYMONGO_PUBLIC_KEY=your_public_key_here
PAYMONGO_API_URL=https://api.paymongo.com/v1
PAYMONGO_WEBHOOK_SECRET=your_webhook_secret_here
PAYMONGO_MODE=test
```

### Frontend Setup (.env.local)

Create/update `frontend/.env.local`:

```bash
# PayMongo Public Key (safe to expose in frontend)
NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_test_mzf8pn3i5issxyuZTPbsEB1t
NEXT_PUBLIC_PAYMONGO_MODE=test
```

---

## 📦 Step 2: Install Required Packages

### Backend Dependencies

```bash
cd backend
pip install requests  # Already installed, but verify
pip install paymongo-python  # Optional: Python SDK
```

Add to `requirements.txt`:
```
requests>=2.31.0
```

### Frontend Dependencies

```bash
cd frontend
pnpm add @paymongo/sdk
# OR use their JavaScript library directly
```

---

## 🔧 Step 3: Create PayMongo Service (Backend)

Create `backend/api/paymongo_service.py`:

```python
"""
PayMongo Payment Gateway Integration
Handles payment processing for dental clinic billing
"""

import os
import requests
import base64
from decimal import Decimal
from django.conf import settings

class PayMongoService:
    """
    Service for PayMongo payment operations
    Documentation: https://developers.paymongo.com/docs
    """
    
    def __init__(self):
        self.secret_key = os.getenv('PAYMONGO_SECRET_KEY')
        self.public_key = os.getenv('PAYMONGO_PUBLIC_KEY')
        self.base_url = os.getenv('PAYMONGO_API_URL', 'https://api.paymongo.com/v1')
        self.mode = os.getenv('PAYMONGO_MODE', 'test')
        
        if not self.secret_key:
            raise ValueError("PAYMONGO_SECRET_KEY not configured")
    
    def _get_auth_header(self):
        """Create Basic Auth header"""
        credentials = f"{self.secret_key}:"
        encoded = base64.b64encode(credentials.encode()).decode()
        return {'Authorization': f'Basic {encoded}'}
    
    def _to_centavos(self, amount):
        """Convert PHP to centavos (PayMongo uses centavos)"""
        return int(Decimal(str(amount)) * 100)
    
    def _from_centavos(self, centavos):
        """Convert centavos to PHP"""
        return Decimal(centavos) / 100
    
    # ==================== PAYMENT INTENTS ====================
    
    def create_payment_intent(self, amount, description, metadata=None):
        """
        Create a PaymentIntent for payment processing
        
        Args:
            amount: Amount in PHP (will be converted to centavos)
            description: Payment description
            metadata: Dict of additional data (patient_id, billing_id, etc.)
        
        Returns:
            Dict with payment intent data including client_key
        """
        url = f"{self.base_url}/payment_intents"
        
        payload = {
            "data": {
                "attributes": {
                    "amount": self._to_centavos(amount),
                    "currency": "PHP",
                    "description": description,
                    "statement_descriptor": "Dorotheo Dental",
                    "payment_method_allowed": [
                        "card",
                        "gcash",
                        "paymaya",
                        "grab_pay"
                    ]
                }
            }
        }
        
        if metadata:
            payload["data"]["attributes"]["metadata"] = metadata
        
        try:
            response = requests.post(
                url,
                json=payload,
                headers=self._get_auth_header()
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"PayMongo API Error: {e}")
            if hasattr(e.response, 'text'):
                print(f"Response: {e.response.text}")
            raise
    
    def retrieve_payment_intent(self, payment_intent_id):
        """Get payment intent status"""
        url = f"{self.base_url}/payment_intents/{payment_intent_id}"
        
        response = requests.get(url, headers=self._get_auth_header())
        response.raise_for_status()
        return response.json()
    
    def attach_payment_method(self, payment_intent_id, payment_method_id):
        """
        Attach payment method to payment intent
        (Usually done automatically by PayMongo.js in frontend)
        """
        url = f"{self.base_url}/payment_intents/{payment_intent_id}/attach"
        
        payload = {
            "data": {
                "attributes": {
                    "payment_method": payment_method_id,
                    "client_key": "from_frontend",  # Provided by frontend
                    "return_url": f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/payment/success"
                }
            }
        }
        
        response = requests.post(
            url,
            json=payload,
            headers=self._get_auth_header()
        )
        response.raise_for_status()
        return response.json()
    
    # ==================== PAYMENT METHODS ====================
    
    def create_payment_method(self, payment_type, details):
        """
        Create a payment method (card, gcash, etc.)
        Usually created via frontend PayMongo.js
        
        Args:
            payment_type: 'card', 'gcash', 'paymaya', 'grab_pay'
            details: Payment details dict
        """
        url = f"{self.base_url}/payment_methods"
        
        payload = {
            "data": {
                "attributes": {
                    "type": payment_type,
                    "details": details
                }
            }
        }
        
        response = requests.post(
            url,
            json=payload,
            headers=self._get_auth_header()
        )
        response.raise_for_status()
        return response.json()
    
    # ==================== SOURCES (Alternative Payment Methods) ====================
    
    def create_source(self, amount, source_type, redirect_url, metadata=None):
        """
        Create a source for GCash, GrabPay, etc.
        
        Args:
            amount: Amount in PHP
            source_type: 'gcash', 'grab_pay'
            redirect_url: Where to redirect after payment
            metadata: Additional data
        """
        url = f"{self.base_url}/sources"
        
        payload = {
            "data": {
                "attributes": {
                    "type": source_type,
                    "amount": self._to_centavos(amount),
                    "currency": "PHP",
                    "redirect": {
                        "success": f"{redirect_url}?status=success",
                        "failed": f"{redirect_url}?status=failed"
                    }
                }
            }
        }
        
        if metadata:
            payload["data"]["attributes"]["metadata"] = metadata
        
        response = requests.post(
            url,
            json=payload,
            headers=self._get_auth_header()
        )
        response.raise_for_status()
        return response.json()
    
    # ==================== WEBHOOKS ====================
    
    def verify_webhook_signature(self, payload, signature):
        """
        Verify webhook signature for security
        
        Args:
            payload: Raw webhook payload (bytes)
            signature: Signature from PayMongo-Signature header
        """
        import hmac
        import hashlib
        
        webhook_secret = os.getenv('PAYMONGO_WEBHOOK_SECRET', '')
        if not webhook_secret:
            print("WARNING: PAYMONGO_WEBHOOK_SECRET not set")
            return False
        
        computed_signature = hmac.new(
            webhook_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(computed_signature, signature)
    
    # ==================== REFUNDS ====================
    
    def create_refund(self, payment_intent_id, amount=None, reason="customer_request"):
        """
        Create a refund for a payment
        
        Args:
            payment_intent_id: ID of payment to refund
            amount: Amount to refund in PHP (None = full refund)
            reason: Refund reason
        """
        url = f"{self.base_url}/refunds"
        
        payload = {
            "data": {
                "attributes": {
                    "payment_id": payment_intent_id,
                    "reason": reason
                }
            }
        }
        
        if amount:
            payload["data"]["attributes"]["amount"] = self._to_centavos(amount)
        
        response = requests.post(
            url,
            json=payload,
            headers=self._get_auth_header()
        )
        response.raise_for_status()
        return response.json()


# Singleton instance
paymongo_service = PayMongoService()
```

---

## 🛠️ Step 4: Create Payment API Endpoints

Create `backend/api/payment_views.py`:

```python
"""
Payment API endpoints for billing payments
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponse
from .paymongo_service import paymongo_service
from .models import Billing, User
import json

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_intent(request):
    """
    Create a payment intent for billing payment
    
    POST /api/payments/create-intent/
    Body: {
        "billing_id": 123,
        "amount": 1500.00  # Optional, defaults to billing amount
    }
    """
    try:
        billing_id = request.data.get('billing_id')
        amount = request.data.get('amount')
        
        # Get billing record
        billing = Billing.objects.get(id=billing_id)
        
        # Verify user has access
        if request.user.user_type == 'patient' and billing.patient.id != request.user.id:
            return Response(
                {'error': 'Unauthorized access to billing record'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Use billing amount if not provided
        if not amount:
            amount = float(billing.amount)
        
        # Create payment intent
        payment_intent = paymongo_service.create_payment_intent(
            amount=amount,
            description=f"Billing #{billing.id} - {billing.description}",
            metadata={
                'billing_id': str(billing.id),
                'patient_id': str(billing.patient.id),
                'patient_name': billing.patient.get_full_name(),
                'clinic_id': str(billing.clinic.id) if billing.clinic else None
            }
        )
        
        # Store payment intent ID in billing for tracking
        # You may want to add a payment_intent_id field to Billing model
        
        return Response({
            'success': True,
            'payment_intent': payment_intent['data'],
            'client_key': payment_intent['data']['attributes']['client_key']
        })
        
    except Billing.DoesNotExist:
        return Response(
            {'error': 'Billing record not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    """
    Verify payment status and update billing
    
    POST /api/payments/verify/
    Body: {
        "payment_intent_id": "pi_xxx",
        "billing_id": 123
    }
    """
    try:
        payment_intent_id = request.data.get('payment_intent_id')
        billing_id = request.data.get('billing_id')
        
        # Retrieve payment intent from PayMongo
        payment_intent = paymongo_service.retrieve_payment_intent(payment_intent_id)
        
        payment_status = payment_intent['data']['attributes']['status']
        
        if payment_status == 'succeeded':
            # Update billing record
            billing = Billing.objects.get(id=billing_id)
            billing.status = 'paid'
            billing.paid = True
            billing.save()
            
            return Response({
                'success': True,
                'message': 'Payment successful',
                'billing': {
                    'id': billing.id,
                    'status': billing.status,
                    'amount': float(billing.amount)
                }
            })
        else:
            return Response({
                'success': False,
                'message': f'Payment status: {payment_status}',
                'status': payment_status
            })
            
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@csrf_exempt  # PayMongo webhooks don't include CSRF token
def paymongo_webhook(request):
    """
    Webhook endpoint for PayMongo events
    
    POST /api/payments/webhook/
    
    Setup webhook in PayMongo dashboard:
    URL: https://your-backend.railway.app/api/payments/webhook/
    Events: payment.paid, payment.failed
    """
    if request.method != 'POST':
        return HttpResponse(status=405)
    
    try:
        # Get signature from header
        signature = request.META.get('HTTP_PAYMONGO_SIGNATURE')
        
        # Verify signature
        if not paymongo_service.verify_webhook_signature(request.body, signature):
            return HttpResponse('Invalid signature', status=400)
        
        # Parse webhook data
        data = json.loads(request.body)
        event_type = data['data']['attributes']['type']
        
        if event_type == 'payment.paid':
            # Extract payment details
            payment_data = data['data']['attributes']['data']['attributes']
            metadata = payment_data.get('metadata', {})
            billing_id = metadata.get('billing_id')
            
            if billing_id:
                # Update billing status
                billing = Billing.objects.get(id=billing_id)
                billing.status = 'paid'
                billing.paid = True
                billing.save()
                
                print(f"Billing #{billing_id} marked as paid via webhook")
        
        elif event_type == 'payment.failed':
            # Handle failed payment
            payment_data = data['data']['attributes']['data']['attributes']
            metadata = payment_data.get('metadata', {})
            billing_id = metadata.get('billing_id')
            
            print(f"Payment failed for billing #{billing_id}")
        
        return HttpResponse(status=200)
        
    except Exception as e:
        print(f"Webhook error: {e}")
        return HttpResponse(str(e), status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_refund(request):
    """
    Create a refund for a payment
    
    POST /api/payments/refund/
    Body: {
        "payment_intent_id": "pi_xxx",
        "billing_id": 123,
        "amount": 500.00,  # Optional, full refund if not provided
        "reason": "customer_request"
    }
    """
    # Only allow staff/owner to create refunds
    if request.user.user_type not in ['staff', 'owner']:
        return Response(
            {'error': 'Only staff can process refunds'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        payment_intent_id = request.data.get('payment_intent_id')
        billing_id = request.data.get('billing_id')
        amount = request.data.get('amount')  # Optional
        reason = request.data.get('reason', 'customer_request')
        
        # Create refund
        refund = paymongo_service.create_refund(
            payment_intent_id=payment_intent_id,
            amount=amount,
            reason=reason
        )
        
        # Update billing if full refund
        if not amount or amount == Billing.objects.get(id=billing_id).amount:
            billing = Billing.objects.get(id=billing_id)
            billing.status = 'cancelled'
            billing.paid = False
            billing.save()
        
        return Response({
            'success': True,
            'refund': refund['data']
        })
        
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
```

---

## 🔌 Step 5: Add Payment URLs

Update `backend/api/urls.py`:

```python
from django.urls import path
from . import views, payment_views

urlpatterns = [
    # ... existing URLs
    
    # Payment endpoints
    path('payments/create-intent/', payment_views.create_payment_intent, name='create_payment_intent'),
    path('payments/verify/', payment_views.verify_payment, name='verify_payment'),
    path('payments/webhook/', payment_views.paymongo_webhook, name='paymongo_webhook'),
    path('payments/refund/', payment_views.create_refund, name='create_refund'),
]
```

---

## 💳 Step 6: Create Frontend Payment Component

Create `frontend/components/payment-modal.tsx`:

```typescript
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  billing: {
    id: number
    amount: number
    description: string
  }
  onPaymentSuccess: () => void
}

export function PaymentModal({ isOpen, onClose, billing, onPaymentSuccess }: PaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'gcash' | 'paymaya'>('card')

  const handlePayment = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      // Step 1: Create payment intent
      const token = localStorage.getItem('authToken')
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/create-intent/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          billing_id: billing.id,
          amount: billing.amount
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create payment intent')
      }

      const data = await response.json()
      const clientKey = data.client_key
      const paymentIntentId = data.payment_intent.id

      // Step 2: Process payment with PayMongo.js
      // Load PayMongo.js library
      const { createPaymentMethod, attachPaymentMethod } = await loadPayMongoJS()

      if (paymentMethod === 'card') {
        // Card payment flow (you'll need to add card input fields)
        const cardDetails = {
          card_number: '4343434343434345', // Test card from PayMongo
          exp_month: 12,
          exp_year: 25,
          cvc: '123'
        }

        const paymentMethodResult = await createPaymentMethod({
          type: 'card',
          details: cardDetails,
          billing: {
            name: 'Patient Name',
            email: 'patient@email.com',
            phone: '09171234567'
          }
        })

        await attachPaymentMethod(paymentIntentId, paymentMethodResult.id, clientKey)
      } else {
        // E-wallet flow (GCash, PayMaya)
        // Redirect to e-wallet payment page
        window.location.href = `https://paymongo-checkout-url/${paymentIntentId}`
      }

      // Step 3: Verify payment
      await verifyPayment(paymentIntentId, billing.id)

      // Success!
      onPaymentSuccess()
      onClose()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const verifyPayment = async (paymentIntentId: string, billingId: number) => {
    const token = localStorage.getItem('authToken')
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/payments/verify/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`
      },
      body: JSON.stringify({
        payment_intent_id: paymentIntentId,
        billing_id: billingId
      })
    })

    if (!response.ok) {
      throw new Error('Payment verification failed')
    }

    return response.json()
  }

  const loadPayMongoJS = async () => {
    // Load PayMongo.js from CDN
    return new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://js.paymongo.com/v1/paymongo.js'
      script.onload = () => {
        resolve((window as any).PayMongo)
      }
      document.body.appendChild(script)
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay Bill</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">{billing.description}</p>
            <p className="text-2xl font-bold text-green-600">₱{billing.amount.toFixed(2)}</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={paymentMethod === 'card' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('card')}
              >
                Card
              </Button>
              <Button
                variant={paymentMethod === 'gcash' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('gcash')}
              >
                GCash
              </Button>
              <Button
                variant={paymentMethod === 'paymaya' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('paymaya')}
              >
                PayMaya
              </Button>
            </div>
          </div>

          {paymentMethod === 'card' && (
            <div className="space-y-3">
              <div>
                <Label>Card Number</Label>
                <Input placeholder="4343 4343 4343 4345" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Expiry</Label>
                  <Input placeholder="MM/YY" />
                </div>
                <div>
                  <Label>CVC</Label>
                  <Input placeholder="123" />
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ₱${billing.amount.toFixed(2)}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 🧪 Step 7: Test Payment Flow

### Test Cards (from PayMongo):

```
✅ SUCCESSFUL PAYMENT:
Card: 4343434343434345
CVC: Any 3 digits
Expiry: Any future date

❌ DECLINED PAYMENT:
Card: 4571736000000075
CVC: Any 3 digits
Expiry: Any future date

⏳ PENDING PAYMENT (requires authentication):
Card: 4120000000000007
CVC: Any 3 digits
Expiry: Any future date
```

### Testing Steps:

1. **Test Payment Creation:**
```bash
# In backend terminal
cd backend
python manage.py shell

from api.paymongo_service import paymongo_service
result = paymongo_service.create_payment_intent(
    amount=1500.00,
    description="Test payment",
    metadata={'test': 'true'}
)
print(result)
```

2. **Test via API:**
```bash
# Create payment intent
curl -X POST http://localhost:8000/api/payments/create-intent/ \
  -H "Authorization: Token YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"billing_id": 1, "amount": 1500.00}'
```

3. **Test Frontend:**
   - Navigate to billing page
   - Click "Pay Now" button
   - Enter test card: `4343434343434345`
   - Complete payment

---

## 🔔 Step 8: Set Up Webhooks

### Create Webhook in PayMongo Dashboard:

1. Go to: https://dashboard.paymongo.com/developers/webhooks
2. Click "Add Webhook"
3. Configure:
   ```
   URL: https://your-backend.railway.app/api/payments/webhook/
   Events: ✓ payment.paid
           ✓ payment.failed
           ✓ payment.refund.updated
   Description: Dorotheo Dental Billing Webhook
   ```
4. Copy the **Signing Secret** and add to `.env`:
   ```
   PAYMONGO_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

### Test Webhook Locally:

Use ngrok or Railway's URL to expose your local backend:
```bash
# If using ngrok
ngrok http 8000

# Update webhook URL in PayMongo dashboard
# Webhook URL: https://abc123.ngrok.io/api/payments/webhook/
```

---

## 🚀 Step 9: Production Deployment

### When Ready for Production:

1. **Switch to LIVE Keys:**
```bash
# In production .env (Railway)
PAYMONGO_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY_HERE  # Get from PayMongo dashboard
PAYMONGO_PUBLIC_KEY=pk_live_YOUR_LIVE_PUBLIC_KEY_HERE  # Get from PayMongo dashboard
PAYMONGO_MODE=live
```

2. **Update Frontend:**
```bash
# In Vercel environment variables
NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY=pk_live_YOUR_LIVE_PUBLIC_KEY_HERE
NEXT_PUBLIC_PAYMONGO_MODE=live
```

3. **Verify Webhook:**
   - Update webhook URL to production domain
   - Test with small real payment
   - Monitor webhook logs

---

## 📊 Step 10: Add Payment History (Optional)

Create migration to add payment tracking:

```bash
cd backend
python manage.py makemigrations

# In the migration file, add:
# - payment_intent_id field to Billing model
# - payment_method field
# - payment_status field
# - paid_at timestamp
```

Update `backend/api/models.py`:

```python
class Billing(models.Model):
    # ... existing fields
    
    # PayMongo integration fields
    payment_intent_id = models.CharField(max_length=100, blank=True, null=True)
    payment_method = models.CharField(max_length=20, blank=True, null=True)  # card, gcash, paymaya
    payment_status = models.CharField(max_length=20, default='pending')  # pending, processing, succeeded, failed
    paid_at = models.DateTimeField(null=True, blank=True)
```

---

## 🐛 Troubleshooting

### Common Issues:

1. **"Authentication failed"**
   - Check if SECRET_KEY is correct
   - Verify Basic Auth header format

2. **"Invalid amount"**
   - PayMongo uses centavos (multiply by 100)
   - Ensure amount is integer in centavos

3. **Webhook not receiving events:**
   - Check webhook URL is publicly accessible
   - Verify webhook secret is correct
   - Check PayMongo dashboard for delivery status

4. **CORS errors:**
   - Add PayMongo domains to CORS whitelist in Django settings

---

## 📝 Next Steps

After setup:
- [ ] Test all payment methods (card, GCash, PayMaya)
- [ ] Implement refund flow
- [ ] Add payment history to patient dashboard
- [ ] Set up email notifications for successful payments
- [ ] Monitor webhook logs
- [ ] Test production keys with small amount
- [ ] Train staff on payment processing
- [ ] Document payment procedures

---

## 📚 Resources

- **PayMongo Docs**: https://developers.paymongo.com/docs
- **Test Cards**: https://developers.paymongo.com/docs/testing
- **Webhook Events**: https://developers.paymongo.com/docs/webhooks
- **API Reference**: https://developers.paymongo.com/reference
- **Support**: support@paymongo.com

---

**Need Help?** Check the PayMongo dashboard for detailed error logs and transaction history.

**Security Note**: Never commit API keys to git. Always use environment variables.
