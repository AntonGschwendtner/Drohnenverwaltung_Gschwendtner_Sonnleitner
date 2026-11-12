using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Common;

public static class DbUpdateExceptionExtensions
{
    private const int SqliteConstraintError = 19;
    private const int SqliteConstraintUniqueExtendedError = 2067;
    private const int SqliteConstraintForeignKeyExtendedError = 787;

    /// <summary>
    /// True when a unique index refused the insert, which also covers two requests arriving at the same time.
    /// </summary>
    public static bool IsUniqueConstraintViolation(this DbUpdateException exception) =>
        exception.InnerException is SqliteException
        {
            SqliteErrorCode: SqliteConstraintError,
            SqliteExtendedErrorCode: SqliteConstraintUniqueExtendedError,
        };

    /// <summary>
    /// True when a foreign key refused the change, for example deleting a drone that a loan still references.
    /// SQLite reports this with the extended code for foreign keys or, for checks it runs as triggers, with the
    /// trigger code, so the message decides.
    /// </summary>
    public static bool IsForeignKeyViolation(this DbUpdateException exception) =>
        exception.InnerException is SqliteException { SqliteErrorCode: SqliteConstraintError } sqliteException
        && (sqliteException.SqliteExtendedErrorCode == SqliteConstraintForeignKeyExtendedError
            || sqliteException.Message.Contains("FOREIGN KEY", StringComparison.Ordinal));
}
