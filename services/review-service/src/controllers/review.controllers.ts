import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Review from "../models/review.model";
import { publishEvent } from "../events/publisher";
import axios from "axios";

// REGISTER - POST /review/register

export const Registeration =
asyncHandler(
  async (
    req: Request,
    res: Response
  ): Promise<void> => {

    const {
      userId,
      hospitalId,
      doctorId,
      comment,
      rating,
     
    } = req.body;

    /* =========================
       VALIDATE INPUT
    ========================== */


    if (!userId) {
      res.status(400).json({
        success: false,
        message: "userId required"
      });
      return;
    }




    if (!rating) {
      res.status(400).json({
        success: false,
        message: "rating required"
      });
      return;
    }

    /* =========================
       EXISTENCE CHECKS
    ========================== */

    let user: any;
    let bookings: any[] = [];

    const reqConfig = { headers: { Authorization: req.headers.authorization } };

    const promises = [
      axios.get(`${process.env.USER_SERVICE_URL}/users/${userId}`, reqConfig),
      hospitalId ? axios.get(`${process.env.HOSPITAL_SERVICE_URL}/hospital/${hospitalId}`, reqConfig) : Promise.resolve(null),
      doctorId ? axios.get(`${process.env.DOCTOR_SERVICE_URL}/doctor/${doctorId}`, reqConfig) : Promise.resolve(null),
      axios.get(`${process.env.BOOKING_SERVICE_URL}/booking`, reqConfig)
    ];

    const results = await Promise.allSettled(promises);

    // 1. Check User
    const userResult = results[0];
    if (userResult.status === "rejected") {
      const err = userResult.reason;
      if (err.response?.status === 404) {
        res.status(404).json({ success: false, message: `User with ID ${userId} does not exist` });
      } else {
        res.status(err.response?.status || 500).json({ success: false, message: "Error fetching user data" });
      }
      return;
    }
    user = userResult.value;

    // 2. Check Hospital
    const hospitalResult = results[1];
    if (hospitalId && hospitalResult.status === "rejected") {
      const err = hospitalResult.reason;
      if (err.response?.status === 404) {
        res.status(404).json({ success: false, message: `Hospital with ID ${hospitalId} does not exist` });
      } else {
        res.status(err.response?.status || 500).json({ success: false, message: "Error fetching hospital data" });
      }
      return;
    }

    // 3. Check Doctor
    const doctorResult = results[2];
    if (doctorId && doctorResult.status === "rejected") {
      const err = doctorResult.reason;
      if (err.response?.status === 404) {
        res.status(404).json({ success: false, message: `Doctor with ID ${doctorId} does not exist` });
      } else {
        res.status(err.response?.status || 500).json({ success: false, message: "Error fetching doctor data" });
      }
      return;
    }

    // 4. Check Bookings
    const bookingResult = results[3];
    if (bookingResult.status === "rejected") {
      const err = bookingResult.reason;
      if (err.response?.status === 404) {
        bookings = []; // No bookings found
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to fetch bookings from booking service"
        });
        return;
      }
    } else {
      bookings = bookingResult.value?.data?.data || [];
    }

    /* =========================
       FILTER BOOKINGS
    ========================== */

    let matchedBookings: any[] = [];

    if (hospitalId && doctorId) {

      matchedBookings =
        bookings.filter((val: any) =>
          val.doctorId == doctorId &&
          val.hospitalId == hospitalId
        );

    }
    else if (hospitalId) {

      matchedBookings =
        bookings.filter((val: any) =>
          val.hospitalId == hospitalId
        );

    }

    // /* =========================
    //    CHECK USER COMPLETED BOOKING
    // ========================== */

    const userBookings =
      matchedBookings.filter(
        (val: any) =>
          val.userId == userId &&
          val.status == "completed"
      );

    if (userBookings.length === 0) {

      res.status(400).json({
        success: false,
        message:
          "You don't have any completed booking to review"
      });

      return;
    }

    








    const whereClause: any = { userId };

if (doctorId) {
    whereClause.doctorId = doctorId;
}

if (hospitalId) {
    whereClause.hospitalId = hospitalId;
}

const existingReview = await Review.findOne({
    where: whereClause,
});

if (existingReview) {
    res.status(409).json({
        success: false,
        message: "You have already submitted a review.",
    });
    return;
}


    /* =========================
       CREATE REVIEW
    ========================== */

let newReview : any;

    try {
        if (hospitalId && doctorId) {
            newReview = await Review.create({
                userId,
                doctorId,
                comment,
                rating,
                imageUrl: user?.data?.data?.imageUrl,
                name: user?.data?.data?.name,
            });
        } else {
            newReview = await Review.create({
                userId,
                hospitalId,
                comment,
                rating,
                imageUrl: user?.data?.data?.imageUrl,
                name: user?.data?.data?.name,
            });
        }
    } catch (error: any) {
        if (error.name === "SequelizeUniqueConstraintError") {
            res.status(409).json({
                success: false,
                message: "You have already submitted a review.",
            });
            return;
        }
        throw error;
    }



    /* =========================
       PUBLISH EVENT
    ========================== */

    await publishEvent(
      "review_events",
      "REVIEW_REGISTERED",
      {
        reviewId: newReview.id,
        userId,
        hospitalId,
        doctorId,
        comment
      }
    );

    /* =========================
       RESPONSE
    ========================== */

    res.status(201).json({
      success: true,
      message:
        "Review created successfully",
      data: newReview,
      error: null,
    });

  }
);



// GET ONE - GET /review/:id
export const getanReview : any = asyncHandler(async (req: Request, res: Response) => {
  const review = await Review.findByPk(req.params.id);
  if (!review) {
    res.status(404).json({
      success: false,
      message: "review not found",
      data: null,
      error: { code: "REVIEW_NOT_FOUND", details: null },
    });
    return;
  }

  res.status(200).json({
    success: true,
    status: "Success",
    data: review,
    error: null,
  });
});





// UPDATE - PUT /review/:id
export const updateData: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updatePayload = req.body;

  const review = await Review.update(updatePayload, {
    where: { id: id },
    returning: true,
  });

  if (!review[1] || review[1].length === 0) {
    res.status(404).json({
      success: false,
      message: "review not found",
      status: 200,
      data: null,
      error: { code: "REVIEW_NOT_FOUND", details: null },
    });
    return;
  }

  await publishEvent("review_events", "REVIEW_UPDATED", {
    staffId: review[1][0].id,
  });

  res.status(200).json({
    success: true,
    message: "successfully updated",
    data: review[1][0],
    error: null,
  });
});

// DELETE - DELETE /review/:id
export const reviewDelete: any = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const review = await Review.findByPk(id);
  if (!review) {
    res.status(404).json({
      success: false,
      message: "review not found",
      data: null,
      error: { code: "REVIEW_NOT_FOUND", details: null },
    });
    return;
  }


  await Review.destroy({
    where: { id: id }
  });


  res.status(200).json({
    success: true,
    message: "Review deleted successfully",
    status: 200,
    data: null,
    error: null,
  });
});

// GET ALL - GET /review

export const getReview: any = asyncHandler(
  async (req: Request, res: Response) : Promise<void> => {
    let {
      hospitalId,
      doctorId,
      page = 1,
      limit = 5,
    }: any = req.query;

    // Normalize query params
    const normalize = (val: any) =>
      Array.isArray(val) ? val[0] : val;

    hospitalId = normalize(hospitalId);
    doctorId = normalize(doctorId);
    page = normalize(page);
    limit = normalize(limit);

    // Pagination
    page = Math.max(Number(page) || 1, 1);
    limit = Math.min(Math.max(Number(limit) || 5, 1), 100);

    const offset = (page - 1) * limit;

    // Where clause
    const whereClause: any = {};

    // Hospital filter
    if (hospitalId && !isNaN(Number(hospitalId))) {
      whereClause.hospitalId = Number(hospitalId);
    }

    // Doctor filter
    if (doctorId && !isNaN(Number(doctorId))) {
      whereClause.doctorId = Number(doctorId);
    }

    // Fetch reviews
    const { count, rows } = await Review.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

     res.status(200).json({
      success: true,
      message:
        rows.length > 0
          ? "Review fetched successfully"
          : "No reviews found",
      data: rows,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        limit,
        hasNextPage: page < Math.ceil(count / limit),
        hasPreviousPage: page > 1,
      },
      error: null,
    });
    return;
  }
);




export const getRating: any = asyncHandler(
  async (req: Request, res: Response) => {
    let { hospitalId, doctorId }: any = req.query;

    // Normalize query params
    const normalize = (val: any) =>
      Array.isArray(val) ? val[0] : val;

    hospitalId = normalize(hospitalId);
    doctorId = normalize(doctorId);

    // Base filter
    const whereClause: any = {};

    if (hospitalId) {
      whereClause.hospitalId = Number(hospitalId);
    }

    if (doctorId) {
      whereClause.doctorId = Number(doctorId);
    }

    // Fetch reviews
    const reviews = await Review.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
    });

    const totalReviews = reviews.length;

    // Rating counters
    const breakdown = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    let totalRating = 0;

    reviews.forEach((review: any) => {
      const star = Number(review.rating);

      if (star >= 1 && star <= 5) {
        breakdown[star as keyof typeof breakdown]++;
        totalRating += star;
      }
    });

    // Average Rating
    const averageRating =
      totalReviews > 0
        ? Number((totalRating / totalReviews).toFixed(1))
        : 0;

    // Percentage Calculation
    const ratingBreakdown = {
      5: {
        count: breakdown[5],
        percentage:
          totalReviews > 0
            ? Number(
                ((breakdown[5] / totalReviews) * 100).toFixed(1)
              )
            : 0,
      },
      4: {
        count: breakdown[4],
        percentage:
          totalReviews > 0
            ? Number(
                ((breakdown[4] / totalReviews) * 100).toFixed(1)
              )
            : 0,
      },
      3: {
        count: breakdown[3],
        percentage:
          totalReviews > 0
            ? Number(
                ((breakdown[3] / totalReviews) * 100).toFixed(1)
              )
            : 0,
      },
      2: {
        count: breakdown[2],
        percentage:
          totalReviews > 0
            ? Number(
                ((breakdown[2] / totalReviews) * 100).toFixed(1)
              )
            : 0,
      },
      1: {
        count: breakdown[1],
        percentage:
          totalReviews > 0
            ? Number(
                ((breakdown[1] / totalReviews) * 100).toFixed(1)
              )
            : 0,
      },
    };

    res.status(200).json({
      success: true,
      message: "Rating fetched successfully",
      data: {
        averageRating,
        totalReviews,
        ratingBreakdown,
      },
      error: null,
    });
  }
);
