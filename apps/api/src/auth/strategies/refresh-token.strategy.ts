import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKeyProvider: (_request: any, _rawJwtToken: any, done: (err: any, secret: any) => void) => {
        done(null, configService.get('JWT_REFRESH_SECRET'));
      },
    });
  }

  validate(payload: any) {
    return payload;
  }
}
