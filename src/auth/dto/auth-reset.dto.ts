import { isJWT, IsString, MinLength } from 'class-validator';

export class AuthResetDTO {
  @IsString()
  @MinLength(6)
  password: string;

  // @isJWT()
  // token: string;
}
