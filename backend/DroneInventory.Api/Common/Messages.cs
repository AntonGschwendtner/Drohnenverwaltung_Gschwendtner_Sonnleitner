using System.Globalization;

namespace DroneInventory.Api.Common;

/// <summary>
/// The rejection messages in English and German. The language follows the Accept-Language header of the request.
/// </summary>
public static class Messages
{
    public const string English = "en";
    public const string German = "de";

    private static bool IsGerman => CultureInfo.CurrentUICulture.TwoLetterISOLanguageName == German;

    public static string RequestNotReadable => Pick(
        "The request could not be read. Check that all values have the expected format.",
        "Die Anfrage konnte nicht gelesen werden. Prüfe, ob alle Werte das erwartete Format haben.");

    public static string DroneNeedsName => Pick(
        "A drone needs a name.",
        "Eine Drohne braucht einen Namen.");

    public static string DroneNameExists(string name) => Pick(
        $"A drone named \"{name}\" already exists.",
        $"Eine Drohne mit dem Namen „{name}“ gibt es bereits.");

    public static string StudentGroupNeedsName => Pick(
        "A student group needs a name.",
        "Eine Schülergruppe braucht einen Namen.");

    public static string StudentGroupNameExists(string name) => Pick(
        $"A student group named \"{name}\" already exists.",
        $"Eine Schülergruppe mit dem Namen „{name}“ gibt es bereits.");

    public static string LoanStatusMissing => Pick(
        "Use status=Active or status=Returned to list loans.",
        "Ausleihen lassen sich mit status=Active oder status=Returned auflisten.");

    public static string LoanNeedsDrone => Pick(
        "A loan needs a drone.",
        "Eine Ausleihe braucht eine Drohne.");

    public static string LoanNeedsStudentGroup => Pick(
        "A loan needs a student group.",
        "Eine Ausleihe braucht eine Schülergruppe.");

    public static string UnknownDrone(int id) => Pick(
        $"The drone with the id {id} does not exist.",
        $"Die Drohne mit der Id {id} gibt es nicht.");

    public static string UnknownStudentGroup(int id) => Pick(
        $"The student group with the id {id} does not exist.",
        $"Die Schülergruppe mit der Id {id} gibt es nicht.");

    public static string UnknownLoan(int id) => Pick(
        $"The loan with the id {id} does not exist.",
        $"Die Ausleihe mit der Id {id} gibt es nicht.");

    public static string LoanAlreadyReturned(int id) => Pick(
        $"The loan with the id {id} is already returned.",
        $"Die Ausleihe mit der Id {id} ist bereits zurückgegeben.");

    public static string DroneAlreadyLoaned(string name) => Pick(
        $"The drone \"{name}\" is already loaned.",
        $"Die Drohne „{name}“ ist bereits ausgeliehen.");

    public static string EmptyLoanItem => Pick(
        "The accessories contain an empty entry.",
        "Das Zubehör enthält einen leeren Eintrag.");

    public static string UnknownLoanItemType(string? type) => Pick(
        $"\"{type}\" is not an accessory type. Use Battery or Propeller.",
        $"„{type}“ ist kein Zubehörtyp. Erlaubt sind Battery und Propeller.");

    public static string LoanItemNeedsQuantity(string type) => Pick(
        $"The accessory type {type} needs a quantity.",
        $"Für den Zubehörtyp {type} fehlt die Menge.");

    public static string NegativeQuantity => Pick(
        "Accessory quantities must not be negative.",
        "Zubehörmengen dürfen nicht negativ sein.");

    public static string LoanItemTypeTwice(string type) => Pick(
        $"The accessory type {type} appears more than once.",
        $"Der Zubehörtyp {type} kommt mehrfach vor.");

    public static string DroneHasLoans(string name) => Pick(
        $"The drone \"{name}\" has loans and cannot be deleted, so the loan history stays complete.",
        $"Die Drohne „{name}“ hat Ausleihen und kann nicht gelöscht werden, damit die Historie vollständig bleibt.");

    public static string StudentGroupHasLoans(string name) => Pick(
        $"The student group \"{name}\" has loans and cannot be deleted, so the loan history stays complete.",
        $"Die Schülergruppe „{name}“ hat Ausleihen und kann nicht gelöscht werden, damit die Historie vollständig bleibt.");

    private static string Pick(string english, string german) => IsGerman ? german : english;
}
