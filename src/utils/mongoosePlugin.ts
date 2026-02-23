import type { Schema } from 'mongoose';

export const standardizationPlugin = (schema: Schema) => {
  const selection = {
    virtuals: true,
    versionKey: false,
    transform: (_: any, ret: any) => {
      delete ret._id;
      return ret;
    },
  };

  schema.set('toJSON', selection);
  schema.set('toObject', selection);
  schema.set('timestamps', true);
};
