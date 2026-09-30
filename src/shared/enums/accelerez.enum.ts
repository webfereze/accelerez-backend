/**
 * The closed lists this product is organised around.
 *
 * Every one of them is filtered on, counted, or shown as a label somewhere. A
 * free-text column would let three spellings of the same thing exist, and the
 * filter, the badge and the statistic would then disagree with each other while
 * each looking correct.
 */

/**
 * What a trainer is for.
 *
 * A visitor arrives knowing the outcome they want, not the method — "vreau să
 * slăbesc", not "vreau periodizare liniară". These are the outcomes, so the
 * directory can be filtered by the thing the visitor already knows about
 * themselves.
 *
 * A trainer carries several: a coach who does weight loss almost always also
 * does nutrition, and forcing one primary specialisation would make half the
 * directory look wrong.
 */
export enum Specialization {
  WEIGHT_LOSS = "weight_loss",
  MUSCLE_GAIN = "muscle_gain",
  STRENGTH = "strength",
  CONDITIONING = "conditioning",
  NUTRITION = "nutrition",
  REHAB = "rehab",
  MOBILITY = "mobility",
  PRENATAL = "prenatal",
  SENIORS = "seniors",
  KIDS = "kids",
  COMPETITION = "competition",
}

/**
 * How the work actually happens.
 *
 * Deliberately separate from `Specialization`: "online" is not a thing a
 * trainer is good at, it is where they are, and a visitor in Cluj filtering for
 * weight loss needs to know which of the two questions they are answering.
 */
export enum TrainingFormat {
  ONLINE = "online",
  IN_PERSON = "in_person",
  HYBRID = "hybrid",
}

/**
 * Where a client stands with a trainer.
 *
 * `PENDING` is the whole reason this is a status and not a boolean: signing up
 * is the client's act, accepting is the trainer's, and the gap between them is
 * a real state somebody has to look at. A trainer who is full declines rather
 * than ignoring.
 *
 * `PAUSED` exists because the alternative — deleting and re-creating — loses
 * every month of history the pair built up.
 */
export enum EnrollmentStatus {
  PENDING = "pending",
  ACTIVE = "active",
  PAUSED = "paused",
  ENDED = "ended",
  DECLINED = "declined",
}

/**
 * Whether a given month has been paid for.
 *
 * **This is the switch that opens the content.** A client sees their trainer's
 * videos, sheets and diets when the current month is `PAID` or `WAIVED`, and
 * sees the paywall otherwise. Everything else in the product is presentation;
 * this is the business rule.
 *
 * `WAIVED` is not `PAID` even though both open the door — a free trial month
 * and a collected month must not add up to the same number in a report, or the
 * revenue figure is a lie nobody notices.
 */
export enum MembershipStatus {
  UNPAID = "unpaid",
  PAID = "paid",
  WAIVED = "waived",
  REFUNDED = "refunded",
}

/**
 * How the money arrived.
 *
 * Every value but `CARD` is somebody's word for it — the trainer marks the
 * month paid because cash changed hands or a transfer landed. `CARD` is
 * reserved for the automated flow and is deliberately **not** settable by hand,
 * so "paid by card" always means a payment processor said so.
 */
export enum PaymentMethod {
  CASH = "cash",
  TRANSFER = "transfer",
  CARD = "card",
  OTHER = "other",
}

/**
 * What kind of thing a trainer handed to a client.
 *
 * The type decides how it renders, not merely what icon it gets: a `VIDEO` is
 * embedded, a `SHEET` opens in Google's viewer, a `DIET` is read on the page,
 * a `DOCUMENT` downloads. Storing "a link" and guessing from the URL works
 * until a trainer pastes a Drive link to a video.
 */
export enum ResourceType {
  VIDEO = "video",
  SHEET = "sheet",
  DIET = "diet",
  TIP = "tip",
  DOCUMENT = "document",
  LINK = "link",
}

/**
 * Who a resource is for.
 *
 * `LIBRARY` is the trainer's standing material — technique videos, the
 * beginner's guide — visible to every active client of theirs. `CLIENT` is
 * written for one person and visible to that person only.
 *
 * Without the distinction a trainer with forty clients uploads the same
 * technique video forty times, which is how a coach stops using the product.
 */
export enum ResourceVisibility {
  CLIENT = "client",
  LIBRARY = "library",
}

/**
 * A video the client recorded of themselves.
 *
 * `PENDING` means the trainer owes them an answer, and it is the number on the
 * trainer's dashboard. A form that accepts video and never shows anyone that
 * something is waiting is a form that trains clients to stop filming.
 */
export enum ClientVideoStatus {
  PENDING = "pending",
  REVIEWED = "reviewed",
  ARCHIVED = "archived",
}

/** Where a contact request has got to. */
export enum RequestStatus {
  NEW = "new",
  HANDLED = "handled",
  SPAM = "spam",
}

/**
 * The blog's categories.
 *
 * Five, closed, each answering a question a visitor actually types. An empty
 * category is never shown — which only works because the set is closed and
 * countable.
 */
export enum BlogCategory {
  TRAINING = "training",
  NUTRITION = "nutrition",
  RECOVERY = "recovery",
  MINDSET = "mindset",
  STORIES = "stories",
}

/**
 * What kind of session is in the calendar.
 *
 * The distinction is not cosmetic: a `ONE_TO_ONE` has exactly one attendee and
 * a `GROUP` has a capacity, so the booking rules differ. `ASSESSMENT` is its
 * own kind because it is the appointment a trainer must not let a group fill.
 */
export enum SessionKind {
  ONE_TO_ONE = "one_to_one",
  GROUP = "group",
  ASSESSMENT = "assessment",
}

/** Where the session happens. Online sessions carry a meeting link instead of a room. */
export enum SessionLocation {
  GYM = "gym",
  ONLINE = "online",
  OUTDOOR = "outdoor",
  OTHER = "other",
}

/**
 * Where a session stands.
 *
 * `CANCELLED` rather than deleted: a class somebody had in their calendar and
 * then could not find is worse than one marked off. The attendees keep seeing
 * it, struck through, with whatever reason the trainer gave.
 */
export enum SessionStatus {
  SCHEDULED = "scheduled",
  CANCELLED = "cancelled",
  DONE = "done",
}

/**
 * Whether somebody turned up.
 *
 * `BOOKED` is the state before the session happens. The other three are what a
 * trainer marks afterwards, and they are the record a client's attendance rate
 * is counted from — which is the number that predicts whether they will still
 * be training in three months.
 */
export enum AttendanceStatus {
  BOOKED = "booked",
  ATTENDED = "attended",
  ABSENT = "absent",
  EXCUSED = "excused",
}

/**
 * What kind of thing the shop sells — the shop's filter.
 *
 * A closed list because the shop filters on it and the home page can ask for
 * "the meal plans"; `OTHER` is the honest bucket for the thing nobody planned.
 */
export enum ProductCategory {
  TRAINING_PLAN = "training_plan",
  MEAL_PLAN = "meal_plan",
  RECIPES = "recipes",
  MENU = "menu",
  BUNDLE = "bundle",
  OTHER = "other",
}

/**
 * Where an order has got to.
 *
 * `PAID` is set by hand today, by whoever saw the transfer arrive. When card
 * payment lands it is what the payment webhook sets — the states do not
 * change, only who moves an order between them.
 */
export enum OrderStatus {
  /** Just placed. Nobody has answered yet. */
  NEW = "new",
  /** Answered: the payment details were sent, the details agreed. */
  CONFIRMED = "confirmed",
  PAID = "paid",
  /** The plan, the menu, the recipes were sent. The end of the road. */
  DELIVERED = "delivered",
  CANCELLED = "cancelled",
}
