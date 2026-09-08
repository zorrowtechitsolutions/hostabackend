import { Request, Response } from "express";
import Ad from "../models/ad.model";
import axios from "axios";
import dotenv from "dotenv";
import { Op, literal } from "sequelize";
import { publishEvent } from "../events/publisher";
dotenv.config();

/**
 * Creates a new advertisement in the system.
 * 
 * Fetches the hospital details via an internal HTTP request to the hospital-service to get its latitude and longitude.
 * Saves the ad to the database and publishes an 'AD_CREATED' event to RabbitMQ so other services are notified.
 * 
 * @param req - Express Request object containing imageUrl, startDate, endDate, kilometer, and hospitalId in the body
 * @param res - Express Response object
 * @returns JSON response with the created ad data or an error message
 */
export const createAd = async (req: Request, res: Response): Promise<any> => {
  try {
    const { imageUrl, startDate, endDate, kilometer, hospitalId } = req.body;


      const  hospital = await axios.get(`${process.env.HOSPITAL_SERVICE_URL}/hospital/${hospitalId}`)


      if(!hospital){
              return res.status(404).json({ message: "Not found" });

      }


    const ad = await Ad.create({
      imageUrl, startDate, endDate, kilometer, hospitalId,  latitude: hospital?.data?.data?.latitude, longitude: hospital?.data?.data?.longitude,
    } as any);

    await publishEvent("ad_events", "AD_CREATED", {
      adId: ad.id,
      imageUrl: ad.imageUrl,
      hospitalId: ad.hospitalId
    });

    return res.status(201).json({
      message: "Ad created",
      ad,
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * Retrieves all advertisements, optionally filtering them by proximity to the user.
 * 
 * If latitude (lat) and longitude (lng) are provided in the query params, it uses the Haversine formula
 * to calculate the distance between the user and the hospital running the ad. It only returns active ads
 * that fall within the ad's specified 'kilometer' radius and are currently running (between startDate and endDate).
 * If no ads are found nearby, or if no coordinates are provided, it falls back to returning all active ads.
 * 
 * @param req - Express Request object containing optional 'lat' and 'lng' query parameters
 * @param res - Express Response object
 * @returns JSON response with an array of ads
 */
export const getAds = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { lat, lng } = req.query;

    let ads: any;

    if (lat && lng) {
      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);

      // Haversine Formula (distance in KM)
      const distanceFormula = literal(`
        (
          6371 * acos(
            cos(radians(${userLat}))
            * cos(radians(latitude))
            * cos(radians(longitude) - radians(${userLng}))
            + sin(radians(${userLat}))
            * sin(radians(latitude))
          )
        )
      `);

      ads = await Ad.findAll({
        attributes: {
          include: [[distanceFormula, "distance"]],
        },

        where: {
          isActive: true,

          startDate: {
            [Op.lte]: new Date(),
          },

          endDate: {
            [Op.gte]: new Date(),
          },

          [Op.and]: literal(`
            (
              (
                6371 * acos(
                  cos(radians(${userLat}))
                  * cos(radians(latitude))
                  * cos(radians(longitude) - radians(${userLng}))
                  + sin(radians(${userLat}))
                  * sin(radians(latitude))
                )
              ) <= kilometer
            )
          `),
        },

        order: [["createdAt", "DESC"]],
      });

      // If no nearby ads → show all active ads
      if (ads.length === 0) {
        ads = await Ad.findAll({
          where: {
            isActive: true,
          },
          order: [["createdAt", "DESC"]],
        });
      }

    } else {
      // No location → show all ads
      ads = await Ad.findAll({
        where: {
          isActive: true,
        },
        order: [["createdAt", "DESC"]],
      });
    }

    res.json({ ads });

  } catch (error: any) {
    res.status(500).json({
      message: error.message,
    });
  }
};

/**
 * Fetches a single advertisement by its primary key (ID).
 * 
 * @param req - Express Request object containing the ad 'id' in params
 * @param res - Express Response object
 * @returns JSON response with the ad details or a 404 Not Found error
 */
export const getSingleAd = async (req: Request, res: Response): Promise<any> => {
  try {
    const ad = await Ad.findByPk(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: "Not found" });
    }

    res.json(ad);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Updates an existing advertisement.
 * 
 * Finds the ad by ID, updates its fields based on the request body, and publishes 
 * an 'AD_UPDATED' event to RabbitMQ to keep other microservices in sync.
 * 
 * @param req - Express Request object containing the ad 'id' in params and update data in the body
 * @param res - Express Response object
 * @returns JSON response with the updated ad data
 */
export const updateAd = async (req: Request, res: Response): Promise<any> => {
  try {
    const ad = await Ad.findByPk(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: "Not found" });
    }

    await ad.update(req.body);

    await publishEvent("ad_events", "AD_UPDATED", {
      adId: ad.id,
      hospitalId: ad.hospitalId
    });

    res.json({ message: "Updated", ad });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Deletes an advertisement from the database.
 * 
 * Finds the ad by ID, destroys the record, and publishes an 'AD_DELETED' event
 * to RabbitMQ so that dependencies (like notifications or caching) can be cleared.
 * 
 * @param req - Express Request object containing the ad 'id' in params
 * @param res - Express Response object
 * @returns JSON response confirming deletion
 */
export const deleteAd = async (req: Request, res: Response): Promise<any> => {
  try {
    const ad = await Ad.findByPk(req.params.id);

    if (!ad) {
      return res.status(404).json({ message: "Not found" });
    }

    await ad.destroy();

    await publishEvent("ad_events", "AD_DELETED", {
      adId: ad.id,
      hospitalId: ad.hospitalId
    });

    res.json({ message: "Deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
