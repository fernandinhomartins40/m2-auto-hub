import { IsBoolean } from 'class-validator';

export class FAQHelpfulDto {
  @IsBoolean()
  isHelpful!: boolean;
}
