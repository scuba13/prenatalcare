import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';

// Remove pregnancyId from updates (can't change the pregnancy)
export class UpdateTaskDto extends PartialType(
  OmitType(CreateTaskDto, ['pregnancyId'] as const)
) {}
