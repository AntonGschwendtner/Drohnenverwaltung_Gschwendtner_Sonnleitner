using DroneInventory.Api.Common;
using DroneInventory.Api.Data;
using DroneInventory.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace DroneInventory.Api.Statistics;

public sealed record UsageResponse(int Id, string Name, int LoanCount, int LoanDays);

public sealed record StatisticsResponse(
    DateOnly From,
    DateOnly To,
    int LoanCount,
    int ActiveCount,
    double? AverageDays,
    IReadOnlyList<UsageResponse> Drones,
    IReadOnlyList<UsageResponse> StudentGroups);

/// <summary>
/// How drones are used over a period (REQ-030), computed in memory from the loans of the period: the data of one
/// school is small, and DateOnly arithmetic stays in C#.
/// </summary>
public class StatisticsService(DroneInventoryDbContext dbContext, TimeProvider timeProvider)
{
    /// <summary>The school year starts on 1 September (decision of 2026-11-12).</summary>
    public const int SchoolYearStartMonth = 9;

    public async Task<ServiceResult<StatisticsResponse>> GetAsync(DateOnly? from, DateOnly? to, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(timeProvider.GetLocalNow().DateTime);
        var start = from ?? SchoolYearStart(today);
        var end = to ?? today;
        if (start > end)
        {
            return ServiceResult<StatisticsResponse>.Invalid(Messages.StatisticsPeriodInvalid);
        }

        var loans = await dbContext.Loans
            .Where(loan => loan.LoanDate >= start && loan.LoanDate <= end)
            .Select(loan => new { loan.DroneId, loan.StudentGroupId, loan.LoanDate, loan.ReturnDate, loan.Status })
            .ToListAsync(cancellationToken);

        int DaysOf(DateOnly loanDate, DateOnly? returnDate) => (returnDate ?? today).DayNumber - loanDate.DayNumber;

        var returned = loans.Where(loan => loan.Status == LoanStatus.Returned).ToList();
        double? average = returned.Count == 0
            ? null
            : Math.Round(returned.Average(loan => DaysOf(loan.LoanDate, loan.ReturnDate)), 1, MidpointRounding.AwayFromZero);

        var drones = await dbContext.Drones
            .Where(drone => drone.DeletedAt == null)
            .Select(drone => new { drone.Id, drone.Name })
            .ToListAsync(cancellationToken);
        var groups = await dbContext.StudentGroups
            .Where(group => group.DeletedAt == null)
            .Select(group => new { group.Id, group.Name })
            .ToListAsync(cancellationToken);

        static List<UsageResponse> Ranked(IEnumerable<UsageResponse> rows) => rows
            .OrderByDescending(row => row.LoanCount)
            .ThenByDescending(row => row.LoanDays)
            .ThenBy(row => row.Name, StringComparer.CurrentCultureIgnoreCase)
            .ToList();

        var droneUsage = Ranked(drones.Select(drone =>
        {
            var ofDrone = loans.Where(loan => loan.DroneId == drone.Id).ToList();
            return new UsageResponse(drone.Id, drone.Name, ofDrone.Count, ofDrone.Sum(loan => DaysOf(loan.LoanDate, loan.ReturnDate)));
        }));
        var groupUsage = Ranked(groups.Select(group =>
        {
            var ofGroup = loans.Where(loan => loan.StudentGroupId == group.Id).ToList();
            return new UsageResponse(group.Id, group.Name, ofGroup.Count, ofGroup.Sum(loan => DaysOf(loan.LoanDate, loan.ReturnDate)));
        }));

        return ServiceResult<StatisticsResponse>.Success(new StatisticsResponse(
            start,
            end,
            loans.Count,
            loans.Count(loan => loan.Status == LoanStatus.Active),
            average,
            droneUsage,
            groupUsage));
    }

    /// <summary>1 September of this year, or of last year before September.</summary>
    public static DateOnly SchoolYearStart(DateOnly today) =>
        new(today.Month >= SchoolYearStartMonth ? today.Year : today.Year - 1, SchoolYearStartMonth, 1);
}
