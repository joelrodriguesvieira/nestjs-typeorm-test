import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { INestApplication } from '@nestjs/common';
import { authRegisterDTO } from '../src/testing/auth-register-dto.mock';
import { Role } from '../src/enums/role.enum';
import dataSource from '../typeorm/data-source';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: number;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Registrar um novo usuario', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(authRegisterDTO);
    expect(response.statusCode).toEqual(201);
    expect(typeof response.body.accessToken).toEqual('string');
  });

  it('Tentar fazer login com o novo usuário', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: authRegisterDTO.email,
        password: authRegisterDTO.password,
      });
    expect(response.statusCode).toEqual(201);
    expect(typeof response.body.accessToken).toEqual('string');

    accessToken = response.body.accessToken;
  });

  it('Obter os dados do usuário logado', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/me')
      .set('Authorization', `bearer ${accessToken}`)
      .send();
    expect(response.statusCode).toEqual(201);
    expect(typeof response.body.id).toEqual('number');
    expect(response.body.role).toEqual(Role.User);
  });

  it('Registrar um novo usuario como admin', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        ...authRegisterDTO,
        role: Role.Admin,
        email: 'henrique@hcode.com.br',
      });
    expect(response.statusCode).toEqual(201);
    expect(typeof response.body.accessToken).toEqual('string');
    accessToken = response.body.accessToken;
  });

  it('Validar se a função do novo usuario ainda é User', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/me')
      .set('Authorization', `bearer ${accessToken}`)
      .send();
    expect(response.statusCode).toEqual(201);
    expect(typeof response.body.id).toEqual('number');
    expect(response.body.role).toEqual(Role.User);
    userId = response.body.id;
  });

  it('Tentar ver a lista de todos os usuarios', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `bearer ${accessToken}`)
      .send();
    expect(response.statusCode).toEqual(403);
    expect(response.body.error).toEqual('Forbidden');
  });
  it('Alterando manualmente o usuário para a função administrador', async () => {
    const ds = await dataSource.initialize();
    const queryRunner = ds.createQueryRunner();
    await queryRunner.query(`
      UPDATE users SET role = ${Role.Admin} WHERE id = ${userId};
    `);
    const rows = await queryRunner.query(`
      SELECT * FROM users WHERE id = ${userId};
    `);
    dataSource.destroy();
    expect(rows.length).toEqual(1);
    expect(rows[0].role).toEqual(Role.Admin);
  });

  it('Tentar ver a lista de todos os usuários, agora com acesso', async () => {
    const response = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `bearer ${accessToken}`)
      .send();
    expect(response.statusCode).toEqual(200);
    expect(response.body.length).toEqual(2);
  });
});
