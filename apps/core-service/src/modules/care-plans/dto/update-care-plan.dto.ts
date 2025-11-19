import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateCarePlanDto } from './create-care-plan.dto';

// Remove pregnancyId from updates (can't change the pregnancy)
export class UpdateCarePlanDto extends PartialType(
  OmitType(CreateCarePlanDto, ['pregnancyId'] as const)
) {}
