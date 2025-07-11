import Joi from 'joi';

/**
 * Card Model - Represents a game card with validation
 */
export class Card {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.height = data.height;
    this.width = data.width;
    this.imageUrl = data.image_url;
    this.allowedAxes = data.allowed_axes;
    this.metadata = data.metadata || {};
  }

  /**
   * Check if card can be placed on a specific axis
   * @param {string} axis - 'horizontal' or 'vertical'
   * @returns {boolean}
   */
  canBePlacedOnAxis(axis) {
    if (axis === 'horizontal') {
      return this.width !== null && this.width !== undefined;
    } else if (axis === 'vertical') {
      return this.height !== null && this.height !== undefined;
    }
    return false;
  }

  /**
   * Get the metric value for a specific axis
   * @param {string} axis - 'horizontal' or 'vertical'
   * @returns {number|null}
   */
  getMetricValue(axis) {
    if (axis === 'horizontal') {
      return this.width;
    } else if (axis === 'vertical') {
      return this.height;
    }
    return null;
  }

  /**
   * Check if this card can be the origin card (first card)
   * @returns {boolean}
   */
  canBeOriginCard() {
    return this.height !== null && this.width !== null;
  }

  /**
   * Get display name for the metric on a specific axis
   * @param {string} axis - 'horizontal' or 'vertical'
   * @returns {string}
   */
  getMetricName(axis) {
    if (axis === 'horizontal') {
      return 'Breite';
    } else if (axis === 'vertical') {
      return 'Höhe';
    }
    return 'Unbekannt';
  }

  /**
   * Convert card to JSON representation
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      height: this.height,
      width: this.width,
      imageUrl: this.imageUrl,
      allowedAxes: this.allowedAxes,
      metadata: this.metadata
    };
  }

  /**
   * Validate card data
   * @param {Object} data - Card data to validate
   * @returns {Object} Joi validation result
   */
  static validate(data) {
    const schema = Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      height: Joi.number().positive().allow(null),
      width: Joi.number().positive().allow(null),
  image_url: Joi.string().optional(),
      allowed_axes: Joi.array().items(Joi.string().valid('horizontal', 'vertical')).optional(),
      metadata: Joi.object().optional()
    }).custom((value, helpers) => {
      // At least one metric must be present
      if (value.height === null && value.width === null) {
        return helpers.error('custom.noMetrics');
      }
      return value;
    }).messages({
      'custom.noMetrics': 'Card must have at least one metric (height or width)'
    });

    return schema.validate(data);
  }
}

export default Card;
