using System.Globalization;
using System.Text;
using DroneInventory.Api.Common;

namespace DroneInventory.Api.Loans;

/// <summary>
/// Writes the loan history as CSV that a spreadsheet program with German settings opens correctly (REQ-025):
/// UTF-8 with BOM, semicolons, dates as dd.MM.yyyy, and values with a separator, a quote or a line break quoted.
/// </summary>
public static class LoanHistoryCsv
{
    public static byte[] Write(IEnumerable<LoanResponse> loans)
    {
        var csv = new StringBuilder();
        AppendRow(csv, Messages.CsvHeader);

        foreach (var loan in loans)
        {
            AppendRow(csv,
            [
                loan.StudentGroupName,
                loan.DroneName,
                loan.Batteries.ToString(CultureInfo.InvariantCulture),
                loan.Propellers.ToString(CultureInfo.InvariantCulture),
                Date(loan.LoanDate),
                loan.ReturnDate is { } returnDate ? Date(returnDate) : string.Empty,
            ]);
        }

        // The byte order mark tells Excel that the file is UTF-8, so umlauts stay intact.
        return [.. Encoding.UTF8.GetPreamble(), .. Encoding.UTF8.GetBytes(csv.ToString())];
    }

    private static string Date(DateOnly date) => date.ToString("dd.MM.yyyy", CultureInfo.InvariantCulture);

    private static void AppendRow(StringBuilder csv, IReadOnlyList<string> values)
    {
        csv.Append(string.Join(';', values.Select(Quote)));
        csv.Append("\r\n");
    }

    private static string Quote(string value) =>
        value.IndexOfAny([';', '"', '\r', '\n']) >= 0 ? $"\"{value.Replace("\"", "\"\"")}\"" : value;
}
