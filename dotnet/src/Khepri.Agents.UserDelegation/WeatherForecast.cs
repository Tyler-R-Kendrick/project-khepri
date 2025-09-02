namespace Khepri.Khepri.Agents.UserDelegation;

/// <summary>
/// Represents a weather forecast for a specific date.
/// </summary>
/// <param name="Date">The date of the forecast.</param>
/// <param name="TemperatureC">The temperature in Celsius.</param>
/// <param name="Summary">A summary of the weather conditions.</param>
public record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    /// <summary>
    /// Gets the temperature in Fahrenheit.
    /// </summary>
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
