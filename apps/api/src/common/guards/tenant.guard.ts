import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { AuthUser } from "../../modules/auth/types/auth-user.type";

type TenantScopedRequest = {
  user?: AuthUser;
  params: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  body: { tenantId?: string };
};

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<TenantScopedRequest>();
    const user = request.user;

    if (!user || user.role === "ADMIN") {
      return true;
    }

    const requestedTenantId =
      request.body?.tenantId ?? request.query?.tenantId ?? request.params?.tenantId;

    if (requestedTenantId && requestedTenantId !== user.tenantId) {
      throw new ForbiddenException("TENANT_ACCESS_DENIED");
    }

    return true;
  }
}
