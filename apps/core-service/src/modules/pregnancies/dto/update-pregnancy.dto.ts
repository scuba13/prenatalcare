import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePregnancyDto } from './create-pregnancy.dto';

// Remove citizenId from updates (can't change the citizen)
export class UpdatePregnancyDto extends PartialType(
  OmitType(CreatePregnancyDto, ['citizenId'] as const)
) {}
