using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Common;

public static class DbUpdateExceptionExtensions
{
    private const int SqliteConstraintError = 19;
    private const int SqliteConstraintUniqueExtendedError = 2067;

    /// <summary>
    /// True when a unique index refused the insert, which also covers two requests arriving at the same time.
    /// </summary>
    public static bool IsUniqueConstraintViolation(this DbUpdateException exception) =>
        exception.InnerException is SqliteException
        {
            SqliteErrorCode: SqliteConstraintError,
            SqliteExtendedErrorCode: SqliteConstraintUniqueExtendedError,
        };
}
