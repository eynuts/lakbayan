import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { onValue, ref, remove, update } from "firebase/database";
import { useAuth } from "../../AuthContext";
import BottomNav from "../../components/BottomNav";
import {
  addWalletTransaction,
  createNotification,
  db,
  updateWalletBalance,
} from "../../firebase";
import { getEffectiveBookingStatus } from "../../utils/bookingStatus";
import { sendRefundNotification } from "../../utils/emailIntegration";
import "./MyResortReservations.css";

const MyResortReservations = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [resortData, setResortData] = useState(null);
  const [resortId, setResortId] = useState("");
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [deletingId, setDeletingId] = useState(null);
  const [refundingId, setRefundingId] = useState(null);

  // Fetch resort data
  useEffect(() => {
    if (!user) {
      navigate("/profile");
      return;
    }

    const applicationsRef = ref(db, "resortApplications");
    const unsubscribe = onValue(applicationsRef, (snapshot) => {
      const value = snapshot.val();
      if (!value) {
        setLoading(false);
        return;
      }

      const apps = Object.entries(value).map(([id, item]) => ({ id, ...item }));
      const myResort = apps.find(
        (item) =>
          (item.status === "approved" || item.status === "accepted") &&
          (item.ownerId === user?.uid ||
            item.ownerEmail === user?.email ||
            item.email === user?.email),
      );

      if (myResort) {
        setResortData(myResort);
        setResortId(myResort.id);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user, navigate]);

  // Fetch bookings for this resort
  useEffect(() => {
    if (!resortId) return;

    const bookingsRef = ref(db, "bookings");
    const unsubscribe = onValue(bookingsRef, (snapshot) => {
      const value = snapshot.val();
      if (!value) {
        setBookings([]);
        setLoading(false);
        return;
      }

      const allBookings = Object.entries(value).map(([id, item]) => ({
        id,
        ...item,
      }));
      const filtered = allBookings.filter((b) => b.resortId === resortId);
      setBookings(
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      );
      setLoading(false);
    });

    return () => unsubscribe();
  }, [resortId]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getBookingAmount = (booking) =>
    Number(booking.totalPrice ?? booking.depositAmount) || 0;
  const getBookingState = (booking) => getEffectiveBookingStatus(booking);

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(""), 4000);
  };

  const handleRefund = async (bookingId, booking) => {
    if (
      !confirm(
        "Are you sure you want to process a refund for this reservation?",
      )
    )
      return;
    if (booking.paymentStatus === "refunded") {
      showMessage("This reservation has already been refunded.", "error");
      return;
    }

    setRefundingId(bookingId);
    try {
      const refundAmount = getBookingAmount(booking);
      if (!booking.userId) {
        throw new Error("Missing booking user. Cannot return funds to wallet.");
      }
      if (refundAmount <= 0) {
        throw new Error("Invalid refund amount.");
      }

      await updateWalletBalance(booking.userId, refundAmount);
      await addWalletTransaction(booking.userId, {
        type: "refund",
        title: `Refund for ${booking.room?.title || "Room"}`,
        amount: refundAmount,
        resortName: booking.resortName || "",
        bookingId,
        referenceNumber: booking.referenceNumber || "",
        status: "completed",
      });
      await createNotification(booking.userId, {
        title: "Refund Processed",
        message: `${booking.room?.title || "Your booking"} has been refunded to your wallet.`,
        type: "refund",
      });

      const bookingRef = ref(db, `bookings/${bookingId}`);
      await update(bookingRef, {
        paymentStatus: "refunded",
        refundedAt: new Date().toISOString(),
        refundedAmount: refundAmount,
      });

      // Send refund email
      try {
        const emailResult = await sendRefundNotification({
          receiptId: booking.referenceNumber,
          userEmail: booking.email,
          userName: `${booking.firstName} ${booking.lastName}`,
          bookingType: booking.room?.title || "Room",
          numberOfGuests: booking.guests || "1",
          refundAmount,
          originalBookingDate: new Date(booking.checkIn).toLocaleDateString(),
        });
        if (!emailResult.success) {
          console.error("Failed to send refund email:", emailResult.message);
        }
      } catch (emailErr) {
        console.error("Failed to send refund email:", emailErr);
      }

      showMessage("Refund processed successfully");
    } catch (error) {
      showMessage("Failed to process refund: " + error.message, "error");
    } finally {
      setRefundingId(null);
    }
  };

  const handleDelete = async (bookingId) => {
    if (
      !confirm(
        "Are you sure you want to delete this reservation? This action cannot be undone.",
      )
    )
      return;

    setDeletingId(bookingId);
    try {
      const bookingRef = ref(db, `bookings/${bookingId}`);
      await remove(bookingRef);
      showMessage("Reservation deleted successfully");
    } catch (error) {
      showMessage("Failed to delete reservation: " + error.message, "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mres-container">
        <header className="mres-header">
          <button
            className="mres-back"
            onClick={() => navigate("/my-resort/dashboard")}
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          <h1>Reservations</h1>
          <div style={{ width: 40 }}></div>
        </header>
        <main className="mres-main">
          <div className="mres-empty">Loading reservations...</div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="mres-container">
      <header className="mres-header">
        <button
          className="mres-back"
          onClick={() => navigate("/my-resort/dashboard")}
        >
          <i className="fas fa-chevron-left"></i>
        </button>
        <h1>Reservations</h1>
        <span className="mres-badge">{bookings.length}</span>
      </header>

      <main className="mres-main">
        {message && (
          <div className={`mres-message mres-message-${messageType}`}>
            {message}
          </div>
        )}

        {bookings.length > 0 ? (
          <section className="mres-list">
            {bookings.map((booking) => (
              <div key={booking.id} className="mres-card">
                <div className="mres-card-header">
                  <div className="mres-guest-info">
                    <div className="mres-guest-avatar">
                      <i className="fas fa-user"></i>
                    </div>
                    <div className="mres-guest-details">
                      <h3>
                        {booking.firstName} {booking.lastName}
                      </h3>
                      <p>{booking.email}</p>
                    </div>
                  </div>
                  <span className={`mres-status ${getBookingState(booking)}`}>
                    {getBookingState(booking)}
                  </span>
                </div>

                <div className="mres-card-body">
                  <div className="mres-detail-grid">
                    <div className="mres-detail">
                      <i className="fas fa-bed"></i>
                      <div>
                        <span className="mres-label">Room</span>
                        <span className="mres-value">
                          {booking.room?.title || "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="mres-detail">
                      <i className="fas fa-calendar-alt"></i>
                      <div>
                        <span className="mres-label">Check-in</span>
                        <span className="mres-value">
                          {new Date(booking.checkIn).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="mres-detail">
                      <i className="fas fa-calendar-alt"></i>
                      <div>
                        <span className="mres-label">Nights</span>
                        <span className="mres-value">
                          {booking.nights || 1}
                        </span>
                      </div>
                    </div>

                    <div className="mres-detail">
                      <i className="fas fa-users"></i>
                      <div>
                        <span className="mres-label">Room Guests</span>
                        <span className="mres-value">
                          {booking.guests || 1}
                        </span>
                      </div>
                    </div>

                    {booking.guestTypes?.dayTour > 0 && (
                      <div className="mres-detail">
                        <i className="fas fa-user-plus"></i>
                        <div>
                          <span className="mres-label">Additional Guests</span>
                          <span className="mres-value">
                            {booking.guestTypes.dayTour}
                          </span>
                        </div>
                      </div>
                    )}

                    {(booking.guestTypes?.matanda > 0 ||
                      booking.guestTypes?.bata > 0 ||
                      booking.guestTypes?.pwd > 0) && (
                      <div className="mres-detail mres-detail-full">
                        <i className="fas fa-tag"></i>
                        <div>
                          <span className="mres-label">Discounted Guests</span>
                          <span className="mres-value mres-discount-breakdown">
                            {booking.guestTypes?.matanda > 0 && (
                              <span>Matanda ×{booking.guestTypes.matanda}</span>
                            )}
                            {booking.guestTypes?.bata > 0 && (
                              <span>Bata ×{booking.guestTypes.bata}</span>
                            )}
                            {booking.guestTypes?.pwd > 0 && (
                              <span>PWD ×{booking.guestTypes.pwd}</span>
                            )}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="mres-detail">
                      <i className="fas fa-receipt"></i>
                      <div>
                        <span className="mres-label">Reference</span>
                        <span className="mres-value">
                          {booking.referenceNumber}
                        </span>
                      </div>
                    </div>

                    <div className="mres-detail">
                      <i className="fas fa-money-bill"></i>
                      <div>
                        <span className="mres-label">Payment</span>
                        <span className="mres-value">
                          {formatPrice(getBookingAmount(booking))}
                        </span>
                      </div>
                    </div>

                    <div className="mres-detail">
                      <i className="fas fa-calculator"></i>
                      <div>
                        <span className="mres-label">Total</span>
                        <span className="mres-value">
                          {formatPrice(booking.totalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mres-card-actions">
                  <button
                    className="mres-action-btn mres-refund-btn"
                    onClick={() => handleRefund(booking.id, booking)}
                    disabled={
                      refundingId === booking.id ||
                      getBookingState(booking) === "refunded"
                    }
                  >
                    <i className="fas fa-undo"></i>
                    {refundingId === booking.id ? "Processing..." : "Refund"}
                  </button>
                  <button
                    className="mres-action-btn mres-delete-btn"
                    onClick={() => handleDelete(booking.id)}
                    disabled={deletingId === booking.id}
                  >
                    <i className="fas fa-trash-alt"></i>
                    {deletingId === booking.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </section>
        ) : (
          <div className="mres-empty">
            <div className="mres-empty-icon">
              <i className="fas fa-inbox"></i>
            </div>
            <h3>No Reservations</h3>
            <p>You don't have any reservations yet.</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default MyResortReservations;
