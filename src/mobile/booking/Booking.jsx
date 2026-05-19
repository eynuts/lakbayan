import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import { ref, onValue } from "firebase/database";
import { db } from "../../firebase";
import "react-datepicker/dist/react-datepicker.css";
import "./Booking.css";

const Booking = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [room, setRoom] = useState(location.state?.room || null);
  const [resortId, setResortId] = useState(location.state?.resortId || "");
  const [resortName, setResortName] = useState(
    location.state?.resortName || "",
  );
  const [entranceFee, setEntranceFee] = useState(() => {
    const parsed = parseFloat(location.state?.entranceFee || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  });
  const [discountSettings, setDiscountSettings] = useState(
    location.state?.discountSettings || {},
  );
  const [showGuestsModal, setShowGuestsModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    checkIn: null,
    checkOut: null,
    guests: location.state?.room
      ? location.state.room.capacity.match(/\d+/)?.[0] || "1"
      : "1",
    specialRequests: "",
  });
  const [guestTypes, setGuestTypes] = useState({
    matanda: 0,
    bata: 0,
    pwd: 0,
    dayTour: 0,
  });

  // Clamp guestTypes (matanda/bata/pwd only) so their sum never exceeds newMax
  // dayTour is uncapped — it's additional, not counted against room capacity
  const clampGuestTypes = (newMax) => {
    setGuestTypes((prev) => {
      let { matanda, bata, pwd, dayTour } = prev;
      const total = matanda + bata + pwd;
      if (total <= newMax) return prev;
      let excess = total - newMax;
      pwd = Math.max(0, pwd - excess);
      excess = Math.max(0, excess - prev.pwd);
      bata = Math.max(0, bata - excess);
      excess = Math.max(0, excess - prev.bata);
      matanda = Math.max(0, matanda - excess);
      return { matanda, bata, pwd, dayTour };
    });
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    // If somehow navigated here without a room, go back to rooms
    if (!room) {
      navigate("/rooms");
    }
  }, [room, navigate]);

  useEffect(() => {
    if (!resortId) return;

    const resortRef = ref(db, `resortApplications/${resortId}`);
    const unsubscribe = onValue(resortRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const item = snapshot.val() || {};
      const profile = item?.resortProfile || {};

      if (item?.resortName) {
        setResortName(item.resortName);
      }

      const parsedEntranceFee = parseFloat(profile?.entranceFee || 0);
      if (Number.isFinite(parsedEntranceFee) && parsedEntranceFee > 0) {
        setEntranceFee(parsedEntranceFee);
      }

      const nextDiscounts = profile?.discountSettings || {};
      setDiscountSettings(nextDiscounts);
    });

    return () => unsubscribe();
  }, [resortId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (date, name) => {
    setFormData((prev) => ({
      ...prev,
      [name]: date,
    }));
  };

  const calculateNights = () => {
    if (!formData.checkIn || !formData.checkOut) return 0;
    const diffTime = Math.abs(formData.checkOut - formData.checkIn);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1; // Minimum 1 night if dates are selected
  };

  const dayTourCost = guestTypes.dayTour * entranceFee;

  // Percentage discount per guest type (from resort settings)
  const matandaDiscountPct = parseFloat(discountSettings?.matanda || 0);
  const bataDiscountPct = parseFloat(discountSettings?.bata || 0);
  const pwdDiscountPct = parseFloat(discountSettings?.pwd || 0);

  // Peso discount per person = entranceFee × (pct / 100)
  const matandaDiscountPeso = entranceFee * (matandaDiscountPct / 100);
  const bataDiscountPeso = entranceFee * (bataDiscountPct / 100);
  const pwdDiscountPeso = entranceFee * (pwdDiscountPct / 100);

  // Total discount = count × peso-off per person
  const matandaDiscountTotal = guestTypes.matanda * matandaDiscountPeso;
  const bataDiscountTotal = guestTypes.bata * bataDiscountPeso;
  const pwdDiscountTotal = guestTypes.pwd * pwdDiscountPeso;
  const totalDiscount =
    matandaDiscountTotal + bataDiscountTotal + pwdDiscountTotal;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.checkIn || !formData.checkOut) {
      alert("Please select check-in and check-out dates.");
      return;
    }

    const nights = calculateNights();
    const roomSubtotal = room.price * nights;
    const discountedEntranceFee = Math.max(0, dayTourCost - totalDiscount);
    const totalPrice = roomSubtotal + discountedEntranceFee;

    const bookingData = {
      room,
      resortId,
      resortName,
      ...formData,
      guestTypes,
      entranceFee,
      dayTourCost,
      discountSettings,
      matandaDiscountPct,
      bataDiscountPct,
      pwdDiscountPct,
      matandaDiscountPeso,
      bataDiscountPeso,
      pwdDiscountPeso,
      matandaDiscountTotal,
      bataDiscountTotal,
      pwdDiscountTotal,
      totalDiscount,
      nights,
      roomSubtotal,
      discountedEntranceFee: Math.max(0, dayTourCost - totalDiscount),
      totalPrice,
      depositAmount: totalPrice,
    };
    navigate("/payment", { state: { bookingData } });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (!room) return null;

  return (
    <div className="mb-container">
      {/* Header */}
      <header className="mb-header">
        <button
          className="mb-back-btn"
          onClick={() => navigate(-1)}
          type="button"
        >
          <i className="fas fa-arrow-left"></i>
        </button>
        <h2>Reservation</h2>
        <div style={{ width: "40px" }}></div>
      </header>

      {/* Selected Room Summary */}
      <div className="mb-summary animate-slide-up">
        <div className="mb-summary-card">
          <img src={room.image} alt={room.title} />
          <div className="mb-summary-info">
            <span className="mb-summary-badge">{room.subtitle}</span>
            <h3>{room.title}</h3>
            <p className="mb-summary-price">
              {formatPrice(room.price)}
              <span>/night</span>
            </p>
          </div>
        </div>
      </div>

      <main className="mb-main animate-slide-up" style={{ "--delay": "0.1s" }}>
        <form onSubmit={handleSubmit} className="mb-form">
          {/* Stay Details */}
          <div className="mb-section">
            <h3 className="mb-section-title">
              <i className="fas fa-calendar-alt"></i> Stay Details
            </h3>

            <div className="mb-date-grid">
              <div className="mb-input-group">
                <label>Check-in</label>
                <div className="mb-date-input">
                  <i className="fas fa-calendar-day"></i>
                  <DatePicker
                    selected={formData.checkIn}
                    onChange={(date) => handleDateChange(date, "checkIn")}
                    selectsStart
                    startDate={formData.checkIn}
                    endDate={formData.checkOut}
                    minDate={new Date()}
                    placeholderText="Select date"
                    required
                    dateFormat="MMM d, yyyy"
                  />
                </div>
              </div>
              <div className="mb-input-group">
                <label>Check-out</label>
                <div className="mb-date-input">
                  <i className="fas fa-calendar-check"></i>
                  <DatePicker
                    selected={formData.checkOut}
                    onChange={(date) => handleDateChange(date, "checkOut")}
                    selectsEnd
                    startDate={formData.checkIn}
                    endDate={formData.checkOut}
                    minDate={formData.checkIn || new Date()}
                    placeholderText="Select date"
                    required
                    dateFormat="MMM d, yyyy"
                  />
                </div>
              </div>
            </div>

            <div className="mb-input-group">
              <label>Number of Guests</label>
              <div
                className="mb-select-wrapper"
                onClick={() => setShowGuestsModal(true)}
              >
                <i className="fas fa-user-group mb-select-icon"></i>
                <div className="mb-select-display">
                  {formData.guests}{" "}
                  {Number(formData.guests) === 1 ? "Guest" : "Guests"}
                </div>
                <i className="fas fa-chevron-down mb-select-arrow"></i>
              </div>
            </div>

            {/* Guest Type Breakdown */}
            <div className="mb-guest-types">
              <p className="mb-guest-types-label">
                Additions{" "}
                <span className="mb-guest-types-hint">(optional)</span>
              </p>
              {[
                {
                  key: "dayTour",
                  label: "Additional Guest",
                  icon: "fa-user-plus",
                  desc: "Day Visitor / Extra Person",
                  discountPct: 0,
                  isExtra: true,
                },
                {
                  key: "matanda",
                  label: "Matanda",
                  icon: "fa-person",
                  desc: "Senior Citizen",
                  discountPct: matandaDiscountPct,
                  isExtra: false,
                },
                {
                  key: "bata",
                  label: "Bata",
                  icon: "fa-child",
                  desc: "Children",
                  discountPct: bataDiscountPct,
                  isExtra: false,
                },
                {
                  key: "pwd",
                  label: "PWD",
                  icon: "fa-wheelchair",
                  desc: "Persons w/ Disability",
                  discountPct: pwdDiscountPct,
                  isExtra: false,
                },
              ].map(({ key, label, icon, desc, discountPct, isExtra }) => {
                const currentTotal =
                  guestTypes.matanda + guestTypes.bata + guestTypes.pwd;
                // matanda/bata/pwd are capped to the Additional Guest count
                const atMax = !isExtra && currentTotal >= guestTypes.dayTour;
                return (
                  <div
                    key={key}
                    className={`mb-guest-type-row${isExtra ? " mb-daytour-row" : ""}`}
                  >
                    <div className="mb-guest-type-info">
                      <i
                        className={`fas ${icon}${isExtra ? " mb-daytour-icon" : ""}`}
                      ></i>
                      <div>
                        <span className="mb-guest-type-name">{label}</span>
                        <span className="mb-guest-type-desc">{desc}</span>
                        {isExtra ? (
                          <span className="mb-guest-daytour-badge">
                            <i className="fas fa-ticket"></i>
                            {entranceFee > 0
                              ? `${formatPrice(entranceFee)} / person`
                              : "Rate TBD by resort"}
                          </span>
                        ) : (
                          discountPct > 0 && (
                            <span className="mb-guest-discount-badge">
                              <i className="fas fa-tag"></i> {discountPct}% off
                              / person
                            </span>
                          )
                        )}
                      </div>
                    </div>
                    <div className="mb-guest-type-counter">
                      <button
                        type="button"
                        className="mb-gt-btn"
                        onClick={() => {
                          if (isExtra) {
                            // when reducing additional guests, also clamp matanda/bata/pwd
                            setGuestTypes((prev) => {
                              const newDayTour = Math.max(0, prev.dayTour - 1);
                              let { matanda, bata, pwd } = prev;
                              const total = matanda + bata + pwd;
                              if (total > newDayTour) {
                                let excess = total - newDayTour;
                                pwd = Math.max(0, pwd - excess);
                                excess = Math.max(0, excess - prev.pwd);
                                bata = Math.max(0, bata - excess);
                                excess = Math.max(0, excess - prev.bata);
                                matanda = Math.max(0, matanda - excess);
                              }
                              return {
                                ...prev,
                                dayTour: newDayTour,
                                matanda,
                                bata,
                                pwd,
                              };
                            });
                          } else {
                            setGuestTypes((prev) => ({
                              ...prev,
                              [key]: Math.max(0, prev[key] - 1),
                            }));
                          }
                        }}
                      >
                        <i className="fas fa-minus"></i>
                      </button>
                      <span className="mb-gt-count">{guestTypes[key]}</span>
                      <button
                        type="button"
                        className="mb-gt-btn"
                        onClick={() => {
                          if (!atMax)
                            setGuestTypes((prev) => ({
                              ...prev,
                              [key]: prev[key] + 1,
                            }));
                        }}
                        disabled={atMax}
                        style={
                          atMax ? { opacity: 0.35, cursor: "not-allowed" } : {}
                        }
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Guest Information */}
          <div className="mb-section">
            <h3 className="mb-section-title">
              <i className="fas fa-user"></i> Guest Info
            </h3>

            <div className="mb-input-row">
              <div className="mb-input-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="Juan"
                />
              </div>
              <div className="mb-input-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Dela Cruz"
                />
              </div>
            </div>

            <div className="mb-input-group">
              <label>Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="juan@email.com"
              />
            </div>

            <div className="mb-input-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="+63 917 123 4567"
              />
            </div>
          </div>

          {/* Payment Summary */}
          <div className="mb-section mb-payment-summary">
            <h3 className="mb-section-title">
              <i className="fas fa-credit-card"></i> Payment Details
            </h3>

            {/* ── STEP 1: Room rate × nights ── */}
            <div className="mb-calc-step-label">Step 1 · Room Cost</div>
            <div className="mb-payment-row">
              <span>Room rate per night</span>
              <span>{formatPrice(room.price)}</span>
            </div>
            {calculateNights() > 0 ? (
              <>
                <div className="mb-payment-row mb-computation">
                  <span>
                    ✕ {calculateNights()} night
                    {calculateNights() !== 1 ? "s" : ""}
                  </span>
                  <span>= {formatPrice(room.price * calculateNights())}</span>
                </div>
                <div className="mb-payment-row mb-subtotal-row">
                  <span>
                    <strong>Room Subtotal</strong>
                  </span>
                  <span>
                    <strong>
                      {formatPrice(room.price * calculateNights())}
                    </strong>
                  </span>
                </div>
              </>
            ) : (
              <div className="mb-payment-row mb-computation">
                <span>Select dates to compute nights</span>
                <span>—</span>
              </div>
            )}

            {/* ── STEP 2: Additional Guests (entrance fee) ── */}
            {guestTypes.dayTour > 0 && (
              <>
                <div className="mb-calc-step-label" style={{ marginTop: 12 }}>
                  Step 2 · Additional Guests
                </div>
                <div className="mb-payment-row">
                  <span>Entrance fee / person</span>
                  <span>
                    {entranceFee > 0 ? formatPrice(entranceFee) : "TBD"}
                  </span>
                </div>
                <div className="mb-payment-row mb-computation">
                  <span>
                    ✕ {guestTypes.dayTour} additional guest
                    {guestTypes.dayTour > 1 ? "s" : ""}
                  </span>
                  <span>
                    = {entranceFee > 0 ? formatPrice(dayTourCost) : "TBD"}
                  </span>
                </div>
                <div className="mb-payment-row mb-subtotal-row">
                  <span>
                    <strong>Entrance Subtotal</strong>
                  </span>
                  <span>
                    <strong>
                      {entranceFee > 0 ? formatPrice(dayTourCost) : "TBD"}
                    </strong>
                  </span>
                </div>
              </>
            )}

            {/* ── STEP 3: Discounts on entrance fee ── */}
            {(guestTypes.matanda > 0 ||
              guestTypes.bata > 0 ||
              guestTypes.pwd > 0) && (
              <>
                <div className="mb-calc-step-label" style={{ marginTop: 12 }}>
                  Step 3 · Guest Discounts (on entrance fee)
                </div>

                {guestTypes.matanda > 0 && (
                  <div className="mb-payment-row mb-discount-detail-row">
                    <div className="mb-discount-detail-left">
                      <span className="mb-discount-type-name">
                        Matanda (Senior Citizen)
                      </span>
                      <span className="mb-discount-formula">
                        {guestTypes.matanda} person
                        {guestTypes.matanda > 1 ? "s" : ""} ×{" "}
                        {matandaDiscountPct}% off
                        {entranceFee > 0 &&
                          ` (${formatPrice(matandaDiscountPeso)} off each)`}
                      </span>
                    </div>
                    <span
                      className={
                        matandaDiscountPct > 0
                          ? "mb-discount-val"
                          : "mb-no-discount-val"
                      }
                    >
                      {matandaDiscountPct > 0
                        ? `− ${formatPrice(matandaDiscountTotal)}`
                        : "No discount"}
                    </span>
                  </div>
                )}

                {guestTypes.bata > 0 && (
                  <div className="mb-payment-row mb-discount-detail-row">
                    <div className="mb-discount-detail-left">
                      <span className="mb-discount-type-name">
                        Bata (Children)
                      </span>
                      <span className="mb-discount-formula">
                        {guestTypes.bata} person{guestTypes.bata > 1 ? "s" : ""}{" "}
                        × {bataDiscountPct}% off
                        {entranceFee > 0 &&
                          ` (${formatPrice(bataDiscountPeso)} off each)`}
                      </span>
                    </div>
                    <span
                      className={
                        bataDiscountPct > 0
                          ? "mb-discount-val"
                          : "mb-no-discount-val"
                      }
                    >
                      {bataDiscountPct > 0
                        ? `− ${formatPrice(bataDiscountTotal)}`
                        : "No discount"}
                    </span>
                  </div>
                )}

                {guestTypes.pwd > 0 && (
                  <div className="mb-payment-row mb-discount-detail-row">
                    <div className="mb-discount-detail-left">
                      <span className="mb-discount-type-name">PWD</span>
                      <span className="mb-discount-formula">
                        {guestTypes.pwd} person{guestTypes.pwd > 1 ? "s" : ""} ×{" "}
                        {pwdDiscountPct}% off
                        {entranceFee > 0 &&
                          ` (${formatPrice(pwdDiscountPeso)} off each)`}
                      </span>
                    </div>
                    <span
                      className={
                        pwdDiscountPct > 0
                          ? "mb-discount-val"
                          : "mb-no-discount-val"
                      }
                    >
                      {pwdDiscountPct > 0
                        ? `− ${formatPrice(pwdDiscountTotal)}`
                        : "No discount"}
                    </span>
                  </div>
                )}

                {totalDiscount > 0 && (
                  <div className="mb-payment-row mb-subtotal-row">
                    <span>
                      <strong>Total Discount</strong>
                    </span>
                    <span className="mb-discount-val">
                      <strong>− {formatPrice(totalDiscount)}</strong>
                    </span>
                  </div>
                )}
              </>
            )}

            {/* ── STEP 4: Discounted entrance fee ── */}
            {totalDiscount > 0 && guestTypes.dayTour > 0 && (
              <>
                <div className="mb-calc-step-label" style={{ marginTop: 12 }}>
                  Step 4 · After Discount (Entrance Fee)
                </div>
                <div className="mb-payment-row mb-computation">
                  <span>
                    {entranceFee > 0 ? formatPrice(dayTourCost) : "TBD"} −{" "}
                    {formatPrice(totalDiscount)}
                  </span>
                  <span>
                    ={" "}
                    {entranceFee > 0
                      ? formatPrice(Math.max(0, dayTourCost - totalDiscount))
                      : "TBD"}
                  </span>
                </div>
              </>
            )}

            {/* ── GRAND TOTAL ── */}
            <div className="mb-payment-divider"></div>
            <div className="mb-payment-row mb-total">
              <span>Total Payment</span>
              <span>
                {formatPrice(
                  room.price * (calculateNights() || 1) +
                    Math.max(0, dayTourCost - totalDiscount),
                )}
              </span>
            </div>
            <p className="mb-payment-note">
              Full payment is required to confirm your booking.
            </p>
          </div>

          {/* Fixed Bottom Button */}
          <div className="mb-bottom-action">
            <button type="submit" className="mb-submit-btn">
              Proceed to Payment
            </button>
          </div>
        </form>
      </main>

      {/* Guests Modal */}
      {showGuestsModal && (
        <div
          className="mb-modal-overlay animate-fade-in"
          onClick={() => setShowGuestsModal(false)}
        >
          <div
            className="mb-modal-content animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-modal-header">
              <h3>Select Guests</h3>
              <button
                type="button"
                className="mb-close-btn"
                onClick={() => setShowGuestsModal(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="mb-modal-body">
              {parseInt(room.capacity.match(/\d+/)?.[0] || "12") > 20 ? (
                <div className="mb-guests-counter">
                  <button
                    type="button"
                    className="mb-counter-btn"
                    onClick={() => {
                      const newCount = Math.max(
                        1,
                        parseInt(formData.guests) - 1,
                      );
                      setFormData((prev) => ({
                        ...prev,
                        guests: String(newCount),
                      }));
                      clampGuestTypes(newCount);
                    }}
                  >
                    <i className="fas fa-minus"></i>
                  </button>
                  <div className="mb-counter-value">
                    <span>{formData.guests}</span>
                    <small>
                      {Number(formData.guests) === 1 ? "Guest" : "Guests"}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="mb-counter-btn"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        guests: String(
                          Math.min(
                            parseInt(room.capacity.match(/\d+/)?.[0] || "100"),
                            parseInt(prev.guests) + 1,
                          ),
                        ),
                      }))
                    }
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
              ) : (
                <div className="mb-guests-grid">
                  {[
                    ...Array(parseInt(room.capacity.match(/\d+/)?.[0] || "12")),
                  ].map((_, i) => {
                    const num = i + 1;
                    return (
                      <button
                        key={num}
                        type="button"
                        className={`mb-guest-btn ${Number(formData.guests) === num ? "active" : ""}`}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            guests: String(num),
                          }));
                          clampGuestTypes(num);
                          setShowGuestsModal(false);
                        }}
                      >
                        {num} {num === 1 ? "Guest" : "Guests"}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Booking;
