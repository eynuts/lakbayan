/**
 * Email helpers for the Lakbayan frontend.
 * These functions talk to the email backend defined in `backend/server.js`.
 */

import { getBackendUrl } from './backend'

export async function sendBookingConfirmation(bookingData) {
  try {
    const response = await fetch(`${getBackendUrl()}/emailjs/reservation-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: bookingData.userName,
        email: bookingData.userEmail,
        booking_type: `${bookingData.roomType} (${bookingData.roomName})`,
        date: bookingData.checkInDate,
        guests: bookingData.numberOfGuests,
        amount: bookingData.totalAmount,
        receipt_id: bookingData.receiptId || `BK-${Date.now()}`,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result?.details || result?.error || 'Email server request failed')
    }

    if (!result.success) {
      throw new Error(result?.message || result?.error || 'Booking confirmation failed')
    }

    console.log('Booking confirmation email sent!')
    return {
      success: true,
      receiptId: bookingData.receiptId || null,
      message: 'Booking confirmation email has been sent to your email address',
    }
  } catch (error) {
    console.error('Error sending booking confirmation:', error)
    return {
      success: false,
      message: 'Failed to send confirmation email: ' + error.message,
    }
  }
}

export async function sendRefundNotification(refundData) {
  try {
    const response = await fetch(`${getBackendUrl()}/emailjs/refund-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: refundData.userName,
        email: refundData.userEmail,
        booking_type: refundData.bookingType,
        date: refundData.originalBookingDate,
        guests: refundData.numberOfGuests,
        amount: refundData.refundAmount,
        receipt_id: refundData.receiptId,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result?.details || result?.error || 'Email server request failed')
    }

    if (!result.success) {
      throw new Error(result?.message || result?.error || 'Refund confirmation failed')
    }

    console.log('Refund notification email sent!')
    return {
      success: true,
      refundReceiptId: refundData.receiptId,
      message: 'Refund confirmation email has been sent to the user',
    }
  } catch (error) {
    console.error('Error sending refund notification:', error)
    return {
      success: false,
      message: 'Failed to send refund notification: ' + error.message,
    }
  }
}
