const startOfDay = (value) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

export const hasCheckInStarted = (booking, now = new Date()) => {
  if (!booking?.checkIn) return false

  const checkInDate = startOfDay(booking.checkIn)
  const today = startOfDay(now)
  return today >= checkInDate
}

export const getEffectiveBookingStatus = (booking, now = new Date()) => {
  if (!booking) return 'pending'
  if (booking.paymentStatus === 'refunded') return 'refunded'

  if (hasCheckInStarted(booking, now)) {
    return 'confirmed'
  }

  if (booking.bookingStatus === 'cancelled') {
    return 'cancelled'
  }

  if (booking.paymentStatus === 'paid' || booking.paymentStatus === 'completed') {
    return 'upcoming'
  }

  return booking.bookingStatus || booking.paymentStatus || 'pending'
}

export const isRefundedBooking = (booking) => booking?.paymentStatus === 'refunded'
